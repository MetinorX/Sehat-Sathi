from typing import List, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from backend.app.models import UnifiedPredictionResponse, XRayAnalysisResponse
from backend.app.services import (
    audit_logger,
    blockchain_audit_service,
    error_detail,
    fairness_guardian,
    input_validation,
    privacy_shield,
    recommendation_engine,
    report_generator,
    safety_guardrails,
    drift_monitor,
    xray_validation_pipeline,
)
from backend.app.ml import vision_analyzer

router = APIRouter()


@router.post("/xray", response_model=XRayAnalysisResponse)
async def analyze_xray(
    image: UploadFile = File(...),
    modality: str = Form("chest_xray"),
    consent_given: bool = Form(True),
    age_group: str = Form("unknown"),
    sex: str = Form("unknown"),
    ethnicity: str = Form("unknown"),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=error_detail("invalid_input", "File must be an image"),
        )

    consent_check = privacy_shield.validate_consent(
        consent_given=consent_given,
        purpose="xray_analysis"
    )

    if not consent_check["valid"]:
        raise HTTPException(
            status_code=403,
            detail=error_detail("consent_missing", consent_check["message"]),
        )

    image_data = await image.read()

    validation_result = input_validation.validate_xray_request(
        modality=modality,
        image_size_bytes=len(image_data),
    )
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=error_detail(
                "invalid_input",
                "Invalid xray request",
                {"errors": validation_result["errors"]},
            ),
        )

    validation = xray_validation_pipeline.validate(
        image_data=image_data,
        filename=image.filename,
        content_type=image.content_type,
        declared_modality=modality,
    )

    clinical_sanity_fail = validation.get("checks", {}).get("clinical_sanity") == "fail"
    lung_segmentation_fail = validation.get("checks", {}).get("lung_detected") == "fail"
    score = float(validation.get("score", 0.0))
    trust_level = "high" if score >= 75 else "moderate" if score >= 60 else "low"
    blocked = validation.get("status") == "rejected" or score < 60 or clinical_sanity_fail or lung_segmentation_fail

    if blocked:
        audit_record = audit_logger.create_record(
            payload={
                "pipeline": "xray",
                "stage": "validation",
                "status": "blocked",
                "validation": {
                    "valid": validation["valid"],
                    "status": validation.get("status", "rejected"),
                    "blocked": True,
                    "score": validation["score"],
                    "checks": validation["checks"],
                    "errors": validation["errors"],
                    "warnings": validation["warnings"],
                },
                "image_hash": validation["image_hash"],
                "filename": validation["filename"],
            },
            consent_given=consent_given,
        )
        return JSONResponse(
            status_code=200,
            content={
                "status": "blocked",
                "reason": "Invalid medical image",
                "message": "Please upload a valid chest X-ray",
                "trust_indicator": "🔴 Low Trust / Blocked",
                "validation": {
                    "valid": False,
                    "status": "blocked",
                    "blocked": True,
                    "allow_inference": False,
                    "score": validation["score"],
                    "checks": validation["checks"],
                    "warnings": validation["warnings"],
                    "errors": validation["errors"],
                    "details": validation["details"],
                },
                "audit_id": audit_record["audit_hash"],
                "image_hash": validation["image_hash"],
            },
        )

    validated_image = validation.get("processed_image_bytes") or image_data

    analysis = vision_analyzer.analyze_xray(
        image_data=validated_image,
        modality=modality
    )

    if "confidence" not in analysis:
        raise HTTPException(
            status_code=500,
            detail=error_detail("inference_failed", "X-ray model returned invalid output"),
        )

    confidence = float(analysis.get("confidence", 0.0))
    if trust_level == "moderate":
        confidence = min(confidence, 0.65)
    confidence_check = safety_guardrails.check_confidence(confidence, threshold=0.65)
    safety_status = confidence_check["status"]

    if confidence_check["requires_review"]:
        condition = "review_required"
    elif confidence >= 0.75:
        condition = "High-risk lung cancer pattern"
    elif confidence >= 0.5:
        condition = "Indeterminate lung cancer pattern"
    else:
        condition = "review_required"

    demographics = {
        "age_group": age_group,
        "sex": sex,
        "ethnicity": ethnicity,
    }
    fairness = fairness_guardian.check_demographic_parity(
        predictions=[{"probability": confidence}],
        demographics=[demographics],
    )
    fairness_guardian.record_prediction(
        prediction={"probability": confidence},
        demographics=demographics,
    )

    explanation = (
        "This prediction is based on lung texture and opacity patterns in the uploaded chest X-ray. "
        f"Model confidence is {confidence * 100:.1f}%, and final output is marked as {confidence_check['confidence_level']} confidence."
    )
    if trust_level == "moderate":
        explanation += " Validation quality is moderate; interpret with caution."

    recommendations = recommendation_engine.recommendations_for_xray(
        confidence=confidence,
        requires_human_review=bool(confidence_check["requires_review"]),
        findings=analysis.get("findings", []),
    )

    request_id = str(uuid4())
    audit_record = audit_logger.create_record(
        payload={
            "request_id": request_id,
            "modality": modality,
            "status": "inference_complete",
            "condition": condition,
            "confidence": confidence,
            "safety_status": safety_status,
            "fairness_status": fairness.get("status", "unknown"),
            "validation": {
                "valid": validation["valid"],
                "blocked": False,
                "score": validation["score"],
                "checks": validation["checks"],
                "warnings": validation["warnings"],
            },
            "trust_level": trust_level,
            "image_hash": validation["image_hash"],
        },
        consent_given=consent_given,
    )

    blockchain_result = blockchain_audit_service.anchor_audit(
        request_id=request_id,
        audit_hash=audit_record["audit_hash"],
        consent_given=consent_given,
        purpose="xray_analysis",
    )

    drift_monitor.record(
        pipeline="xray",
        score=confidence,
        metadata={"modality": modality},
    )

    report = report_generator.xray_report(
        request_id=request_id,
        condition=condition,
        confidence=confidence,
        fairness_status=fairness.get("status", "unknown"),
        safety_status=safety_status,
        recommendations=recommendations,
    )

    return XRayAnalysisResponse(
        request_id=request_id,
        audit_hash=audit_record["audit_hash"],
        audit_id=audit_record["audit_hash"],
        blockchain_tx_hash=blockchain_result.get("tx_hash"),
        model_name=analysis.get("model_name", "vision_model"),
        model_version=analysis.get("model_version", "unknown"),
        data_version="v1",
        anomaly_detected=analysis["anomaly_detected"],
        confidence=confidence,
        uncertainty=1.0 - confidence,
        confidence_level=confidence_check["confidence_level"],
        prediction=condition,
        condition=condition,
        severity=analysis["severity"],
        safety_status=safety_status,
        requires_human_review=bool(confidence_check["requires_review"]),
        fairness_status=fairness.get("status", "unknown"),
        fairness_score=float(fairness.get("value", 0.0)),
        fairness_details=fairness.get("details", {}),
        findings=analysis["findings"],
        validation={
            "valid": validation["valid"],
            "status": validation.get("status", "accepted_with_warning" if trust_level == "moderate" else "accepted"),
            "blocked": False,
            "allow_inference": validation.get("allow_inference", True),
            "score": validation["score"],
            "checks": validation["checks"],
            "warnings": validation["warnings"],
            "details": validation["details"],
            "image_hash": validation["image_hash"],
            "trust_level": trust_level,
        },
        heatmap_url=f"data:image/png;base64,{analysis.get('heatmap_data', '')}",
        heatmap=analysis.get("heatmap_data", ""),
        regions=analysis.get("regions", []),
        explanation_method=analysis.get("explanation_method", "saliency"),
        explanation=explanation,
        report=report,
        recommendations=recommendations[:5],
        disclaimer=safety_guardrails.generate_disclaimer(),
    )


@router.post("/xray/unified", response_model=UnifiedPredictionResponse)
async def analyze_xray_unified(
    image: UploadFile = File(...),
    modality: str = Form("chest_xray"),
    consent_given: bool = Form(True),
    age_group: str = Form("unknown"),
    sex: str = Form("unknown"),
    ethnicity: str = Form("unknown"),
):
    base = await analyze_xray(
        image=image,
        modality=modality,
        consent_given=consent_given,
        age_group=age_group,
        sex=sex,
        ethnicity=ethnicity,
    )

    return UnifiedPredictionResponse(
        request_id=base.request_id,
        pipeline="xray",
        model_name=base.model_name,
        model_version=base.model_version,
        data_version=base.data_version or "v1",
        prediction={
            "condition": base.condition,
            "confidence_level": base.confidence_level,
            "severity": base.severity,
            "findings": base.findings,
        },
        confidence=base.confidence,
        uncertainty=base.uncertainty if base.uncertainty is not None else 1.0 - base.confidence,
        safety_status=base.safety_status,
        requires_human_review=base.requires_human_review,
        fairness_status=base.fairness_status,
        fairness_details=base.fairness_details,
        explanation_summary=base.explanation,
        recommendations=base.recommendations,
        report=base.report,
        audit_id=base.audit_id or base.audit_hash,
        blockchain_tx_hash=base.blockchain_tx_hash,
        disclaimer=base.disclaimer,
    )


@router.post("/xray/report")
async def generate_report(
    analysis_id: str,
    findings: List[Dict[str, Any]]
) -> Dict[str, Any]:
    report_sections = []
    
    report_sections.append("X-Ray Analysis Report")
    report_sections.append("=" * 40)
    report_sections.append("")
    
    for i, finding in enumerate(findings, 1):
        report_sections.append(f"Finding {i}:")
        report_sections.append(f"  Location: {finding.get('location', 'Unknown')}")
        report_sections.append(f"  Description: {finding.get('description', 'N/A')}")
        report_sections.append(f"  Confidence: {finding.get('confidence', 0) * 100:.1f}%")
        report_sections.append(f"  Severity: {finding.get('severity', 'Unknown')}")
        report_sections.append("")
    
    report_sections.append("-" * 40)
    report_sections.append("Disclaimer: This is an AI-generated report for informational purposes only.")
    report_sections.append("Please consult with a qualified radiologist for clinical interpretation.")
    
    return {
        "report_id": analysis_id,
        "report_text": "\n".join(report_sections),
        "findings_count": len(findings),
        "generated_by": "MedAI Guardian v1.0"
    }
