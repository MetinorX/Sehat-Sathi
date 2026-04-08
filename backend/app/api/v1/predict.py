from uuid import uuid4

from fastapi import APIRouter, HTTPException

from backend.app.models import DiabetesInput, UnifiedPredictionResponse
from backend.app.services import (
    audit_logger,
    blockchain_audit_service,
    error_detail,
    fairness_guardian,
    input_validation,
    privacy_shield,
    safety_guardrails,
)
from backend.app.ml import diabetes_analyzer

router = APIRouter()


@router.post("/diabetes", response_model=UnifiedPredictionResponse)
async def predict_diabetes(input_data: DiabetesInput):
    payload = input_data.model_dump()

    validation_result = input_validation.validate_diabetes_payload(payload)
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=error_detail(
                code="invalid_input",
                message="Invalid diabetes payload",
                extra={"errors": validation_result["errors"]},
            ),
        )

    consent_check = privacy_shield.validate_consent(
        consent_given=input_data.consent_given,
        purpose="diabetes_prediction",
    )
    if not consent_check["valid"]:
        raise HTTPException(
            status_code=403,
            detail=error_detail("consent_missing", consent_check["message"]),
        )

    prediction = diabetes_analyzer.predict(payload)
    probability = float(prediction.get("probability", 0.0))

    confidence_check = safety_guardrails.check_confidence(probability, threshold=0.6)
    requires_review = bool(confidence_check.get("requires_review", False))

    if requires_review:
        risk_label = "review_required"
    elif probability >= 0.7:
        risk_label = "high_diabetes_risk"
    elif probability >= 0.4:
        risk_label = "moderate_diabetes_risk"
    else:
        risk_label = "low_diabetes_risk"

    demographics = input_data.demographics or {
        "age_group": "unknown",
        "sex": "unknown",
        "ethnicity": "unknown",
    }

    fairness = fairness_guardian.check_demographic_parity(
        predictions=[{"probability": probability}],
        demographics=[demographics],
    )
    fairness_guardian.record_prediction(
        prediction={"probability": probability},
        demographics=demographics,
    )

    recommendations = [
        "Confirm with HbA1c and fasting plasma glucose tests",
        "Review diet and physical activity plan",
        "Schedule physician follow-up for risk counseling",
    ]
    if probability >= 0.7:
        recommendations.insert(0, "Prioritize early clinical intervention planning")

    explanation_summary = (
        f"Diabetes risk estimated at {probability * 100:.1f}% using features: "
        f"{', '.join(prediction.get('used_features', [])) or 'core metabolic indicators'}."
    )

    request_id = str(uuid4())
    audit_record = audit_logger.create_record(
        payload={
            "request_id": request_id,
            "pipeline": "diabetes",
            "risk_label": risk_label,
            "probability": probability,
            "safety_status": confidence_check["status"],
            "fairness_status": fairness.get("status", "unknown"),
        },
        consent_given=input_data.consent_given,
    )

    blockchain_result = blockchain_audit_service.anchor_audit(
        request_id=request_id,
        audit_hash=audit_record["audit_hash"],
        consent_given=input_data.consent_given,
        purpose="diabetes_prediction",
    )

    report = "\n".join(
        [
            "Responsible AI Diabetes Risk Report",
            f"Request ID: {request_id}",
            f"Risk Label: {risk_label}",
            f"Risk Probability: {probability * 100:.1f}%",
            f"Confidence Level: {confidence_check['confidence_level']}",
            f"Fairness Status: {fairness.get('status', 'unknown')}",
            "Recommendations:",
            *[f"- {r}" for r in recommendations[:5]],
            "Disclaimer: AI outputs are decision support only.",
        ]
    )

    return UnifiedPredictionResponse(
        request_id=request_id,
        pipeline="diabetes",
        model_name=prediction.get("model_name", "diabetes_bayes_analyzer"),
        model_version=prediction.get("model_version", "1.0.0"),
        data_version="v1",
        prediction={
            "condition": risk_label,
            "probability": probability,
            "confidence_level": confidence_check["confidence_level"],
        },
        confidence=probability,
        uncertainty=1.0 - probability,
        safety_status=confidence_check["status"],
        requires_human_review=requires_review,
        fairness_status=fairness.get("status", "unknown"),
        fairness_details=fairness.get("details", {}),
        explanation_summary=explanation_summary,
        recommendations=recommendations[:5],
        report=report,
        audit_id=audit_record["audit_hash"],
        blockchain_tx_hash=blockchain_result.get("tx_hash"),
        disclaimer=safety_guardrails.generate_disclaimer(),
    )


@router.post("/diabetes/unified", response_model=UnifiedPredictionResponse)
async def predict_diabetes_unified(input_data: DiabetesInput):
    return await predict_diabetes(input_data)
