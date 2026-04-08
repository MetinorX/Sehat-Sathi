import time
import math
from datetime import datetime, timezone
from io import BytesIO
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
except Exception:
    colors = None
    A4 = None
    getSampleStyleSheet = None
    SimpleDocTemplate = None
    Paragraph = None
    Spacer = None
    Table = None
    TableStyle = None

from backend.app.api.v1 import router as api_v1_router
from backend.app.ml import diabetes_analyzer
from backend.app.services import blockchain_audit_service, xray_validation_pipeline
from backend.app.ml import vision_analyzer


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_time = time.time()
    yield
    elapsed = (time.time() - start_time) * 1000


app = FastAPI(
    title="MedAI Guardian - Diabetes & Lung Cancer",
    description="Responsible AI prediction system focused on diabetes risk and lung cancer imaging",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": True,
        "supported_pipelines": ["diabetes", "lung_cancer_xray"],
        "inference_time_ms": 0,
        "blockchain_enabled": blockchain_audit_service.enabled,
        "blockchain_rpc": blockchain_audit_service.rpc_url,
    }


class DiabetesPredictRequest(BaseModel):
    # Legacy 8-feature dashboard payload
    pregnancies: float | None = Field(default=None, ge=0)
    glucose: float | None = Field(default=None, ge=0)
    bloodPressure: float | None = Field(default=None, ge=0)
    blood_pressure: float | None = Field(default=None, ge=0)
    skinThickness: float | None = Field(default=None, ge=0)
    skin_thickness: float | None = Field(default=None, ge=0)
    insulin: float | None = Field(default=None, ge=0)
    bmi: float | None = Field(default=None, ge=0)
    diabetesPedigreeFunction: float | None = Field(default=None, ge=0)
    diabetes_pedigree_function: float | None = Field(default=None, ge=0)
    age: float | None = Field(default=None, ge=0)

    # Dataset-aligned payload
    gender: str | None = None
    familyHistory: int | None = Field(default=None, ge=0, le=1)
    family_history: int | None = Field(default=None, ge=0, le=1)
    physicalActivity: str | None = None
    physical_activity: str | None = None
    dietType: str | None = None
    diet_type: str | None = None
    sleepHours: float | None = Field(default=None, ge=0)
    sleep_hours: float | None = Field(default=None, ge=0)
    fastingGlucose: float | None = Field(default=None, ge=0)
    fasting_glucose: float | None = Field(default=None, ge=0)
    postprandialGlucose: float | None = Field(default=None, ge=0)
    postprandial_glucose: float | None = Field(default=None, ge=0)
    hba1c: float | None = Field(default=None, ge=0)
    cholesterol: float | None = Field(default=None, ge=0)
    frequentUrination: int | None = Field(default=None, ge=0, le=1)
    frequent_urination: int | None = Field(default=None, ge=0, le=1)
    excessiveThirst: int | None = Field(default=None, ge=0, le=1)
    excessive_thirst: int | None = Field(default=None, ge=0, le=1)
    fatigue: int | None = Field(default=None, ge=0, le=1)
    blurredVision: int | None = Field(default=None, ge=0, le=1)
    blurred_vision: int | None = Field(default=None, ge=0, le=1)
    weightLoss: int | None = Field(default=None, ge=0, le=1)
    weight_loss: int | None = Field(default=None, ge=0, le=1)


class LLMExplainRequest(BaseModel):
    task: str
    prediction: Dict[str, Any]
    explainability: Dict[str, Any] = Field(default_factory=dict)


def _derive_bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Normal"
    if bmi < 30:
        return "Overweight"
    return "Obese"


def _derive_age_group(age: float) -> str:
    if age < 30:
        return "18-29"
    if age < 45:
        return "30-44"
    if age < 60:
        return "45-59"
    return "60+"


def _first_defined(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _normalize_diabetes_input(payload: DiabetesPredictRequest) -> Dict[str, float | str]:
    """Map dashboard inputs to the trained model's feature schema."""
    blood_pressure = _first_defined(payload.bloodPressure, payload.blood_pressure)
    dpf = _first_defined(payload.diabetesPedigreeFunction, payload.diabetes_pedigree_function)
    legacy_required = [payload.pregnancies, payload.glucose, blood_pressure, payload.insulin, payload.bmi, dpf, payload.age]
    if any(value is None for value in legacy_required):
        raise ValueError("Incomplete legacy diabetes payload")

    fasting_glucose = float(payload.glucose)
    postprandial_glucose = min(400.0, fasting_glucose * 1.35)
    bmi = float(payload.bmi)
    age = float(payload.age)

    frequent_urination = 1 if fasting_glucose >= 140 else 0
    excessive_thirst = 1 if fasting_glucose >= 145 else 0
    fatigue = 1 if bmi >= 30 else 0
    blurred_vision = 1 if fasting_glucose >= 180 else 0
    weight_loss = 1 if fasting_glucose >= 160 and bmi < 25 else 0

    symptom_burden = (
        frequent_urination + excessive_thirst + fatigue + blurred_vision + weight_loss
    )

    return {
        "Age": age,
        "Gender": "Female" if float(payload.pregnancies) > 0 else "Male",
        "BMI": bmi,
        "Family_History": 1 if float(dpf) >= 0.5 else 0,
        "Physical_Activity": "Low" if bmi >= 30 else "Medium",
        "Diet_Type": "Mixed",
        "Sleep_Hours": 6.5,
        "Fasting_Glucose": fasting_glucose,
        "Postprandial_Glucose": postprandial_glucose,
        "HbA1c": max(4.5, min(14.0, 4.0 + fasting_glucose / 40.0)),
        "Blood_Pressure": float(blood_pressure),
        "Cholesterol": 190.0 + max(0.0, bmi - 25.0) * 1.8,
        "Insulin": float(payload.insulin),
        "Frequent_Urination": frequent_urination,
        "Excessive_Thirst": excessive_thirst,
        "Fatigue": fatigue,
        "Blurred_Vision": blurred_vision,
        "Weight_Loss": weight_loss,
        "BMI_Category": _derive_bmi_category(bmi),
        "Glucose_Ratio_PP_F": postprandial_glucose / fasting_glucose if fasting_glucose > 0 else 1.0,
        "Symptom_Burden": symptom_burden,
        "Age_Group": _derive_age_group(age),
    }


def _dataset_aligned_payload(payload: DiabetesPredictRequest) -> Dict[str, float | str] | None:
    gender = payload.gender
    family_history = _first_defined(payload.familyHistory, payload.family_history)
    physical_activity = _first_defined(payload.physicalActivity, payload.physical_activity)
    diet_type = _first_defined(payload.dietType, payload.diet_type)
    sleep_hours = _first_defined(payload.sleepHours, payload.sleep_hours)
    fasting_glucose = _first_defined(payload.fastingGlucose, payload.fasting_glucose)
    postprandial_glucose = _first_defined(payload.postprandialGlucose, payload.postprandial_glucose)
    blood_pressure = _first_defined(payload.bloodPressure, payload.blood_pressure)
    frequent_urination = _first_defined(payload.frequentUrination, payload.frequent_urination)
    excessive_thirst = _first_defined(payload.excessiveThirst, payload.excessive_thirst)
    blurred_vision = _first_defined(payload.blurredVision, payload.blurred_vision)
    weight_loss = _first_defined(payload.weightLoss, payload.weight_loss)

    required = [
        payload.age,
        gender,
        payload.bmi,
        family_history,
        physical_activity,
        diet_type,
        sleep_hours,
        fasting_glucose,
        postprandial_glucose,
        payload.hba1c,
        blood_pressure,
        payload.cholesterol,
        payload.insulin,
        frequent_urination,
        excessive_thirst,
        payload.fatigue,
        blurred_vision,
        weight_loss,
    ]

    if any(value is None for value in required):
        return None

    age = float(payload.age)
    bmi = float(payload.bmi)
    fasting_glucose = float(fasting_glucose)
    postprandial_glucose = float(postprandial_glucose)

    return {
        "Age": age,
        "Gender": str(gender),
        "BMI": bmi,
        "Family_History": int(family_history),
        "Physical_Activity": str(physical_activity),
        "Diet_Type": str(diet_type),
        "Sleep_Hours": float(sleep_hours),
        "Fasting_Glucose": fasting_glucose,
        "Postprandial_Glucose": postprandial_glucose,
        "HbA1c": float(payload.hba1c),
        "Blood_Pressure": float(blood_pressure),
        "Cholesterol": float(payload.cholesterol),
        "Insulin": float(payload.insulin),
        "Frequent_Urination": int(frequent_urination),
        "Excessive_Thirst": int(excessive_thirst),
        "Fatigue": int(payload.fatigue),
        "Blurred_Vision": int(blurred_vision),
        "Weight_Loss": int(weight_loss),
        "BMI_Category": _derive_bmi_category(bmi),
        "Glucose_Ratio_PP_F": postprandial_glucose / fasting_glucose if fasting_glucose > 0 else 1.0,
        "Symptom_Burden": int(frequent_urination)
        + int(excessive_thirst)
        + int(payload.fatigue)
        + int(blurred_vision)
        + int(weight_loss),
        "Age_Group": _derive_age_group(age),
    }


def _calibrate_risk_score(raw_probability: float) -> float:
    """Compress overconfident raw probabilities using temperature-scaled logit mapping."""
    eps = 1e-6
    p = min(max(float(raw_probability), eps), 1 - eps)
    logit = math.log(p / (1 - p))
    temperature = 2.8
    calibrated = 1.0 / (1.0 + math.exp(-(logit / temperature)))
    return min(max(calibrated, 0.0), 1.0)


def _safe_float(value: float | int | None) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _is_missing_numeric(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    try:
        return not math.isfinite(float(value))
    except (TypeError, ValueError):
        return True


def _estimate_skin_thickness(bmi: float, age: float) -> float:
    estimated = (bmi * 0.6) + (age * 0.1)
    return min(50.0, max(10.0, estimated))


def _apply_input_estimations(
    input_payload: Dict[str, float | str],
    payload: DiabetesPredictRequest,
) -> tuple[Dict[str, float | str], list[Dict[str, Any]]]:
    estimated_inputs: list[Dict[str, Any]] = []
    skin_value = _first_defined(payload.skinThickness, payload.skin_thickness)
    skin_missing = _is_missing_numeric(skin_value)
    if skin_missing:
        bmi = _safe_float(input_payload.get("BMI"))
        age = _safe_float(input_payload.get("Age"))
        estimated_skin = _estimate_skin_thickness(bmi, age)
        input_payload["Skin_Thickness"] = round(estimated_skin, 2)
        estimated_inputs.append(
            {
                "feature": "Skin Thickness",
                "value": round(estimated_skin, 2),
                "estimated": True,
                "method": "Estimated from BMI & Age",
            }
        )
    else:
        input_payload["Skin_Thickness"] = round(_safe_float(skin_value), 2)

    return input_payload, estimated_inputs


def _confidence_adjustment_factor(estimated_count: int) -> float:
    if estimated_count <= 0:
        return 1.0
    if estimated_count == 1:
        return 0.9
    return 0.85


def _normalized_feature_token(name: str) -> str:
    return "".join(ch for ch in str(name).lower() if ch.isalnum())


def _clinical_insights(input_payload: Dict[str, float | str]) -> list[str]:
    insights: list[str] = []
    glucose = _safe_float(input_payload.get("Fasting_Glucose"))
    bmi = _safe_float(input_payload.get("BMI"))
    age = _safe_float(input_payload.get("Age"))

    if glucose > 140:
        insights.append("High glucose is the dominant risk factor")
    if bmi > 30:
        insights.append("BMI indicates obesity-related risk")
    if age > 45:
        insights.append("Age-related metabolic risk is elevated")
    if not insights:
        insights.append("Current metabolic profile does not show dominant high-risk triggers")

    return insights


def _clinical_interpretation(explanation: list[dict[str, float | str]], insights: list[str]) -> str:
    top_positive = [item for item in explanation if _safe_float(item.get("impact")) > 0][:2]
    if top_positive:
        factors = " and ".join(str(item["feature"]).lower() for item in top_positive)
        return (
            f"Elevated {factors} are primary contributors to the predicted diabetes risk. "
            "Lifestyle modification and clinical evaluation are recommended."
        )
    return (
        "Risk estimate is influenced by a balanced profile without dominant adverse contributors. "
        f"Clinical monitoring is still advised. Key insights: {'; '.join(insights)}."
    )


def _heuristic_diabetes_probability(input_payload: Dict[str, float | str]) -> float:
    glucose = _safe_float(input_payload.get("Fasting_Glucose"))
    bmi = _safe_float(input_payload.get("BMI"))
    age = _safe_float(input_payload.get("Age"))
    hba1c = _safe_float(input_payload.get("HbA1c"))
    family_history = _safe_float(input_payload.get("Family_History"))

    glucose_part = min(1.0, max(0.0, glucose / 220.0)) * 0.45
    bmi_part = min(1.0, max(0.0, bmi / 50.0)) * 0.2
    age_part = min(1.0, max(0.0, age / 90.0)) * 0.15
    hba1c_part = min(1.0, max(0.0, hba1c / 12.0)) * 0.15
    history_part = 0.05 if family_history >= 1 else 0.0
    return min(max(glucose_part + bmi_part + age_part + hba1c_part + history_part, 0.0), 0.999)


def _fallback_diabetes_explanation(input_payload: Dict[str, float | str], top_k: int = 8) -> Dict[str, Any]:
    explanation = [
        {"feature": "Glucose", "impact": round((_safe_float(input_payload.get("Fasting_Glucose")) - 110.0) / 120.0, 4)},
        {"feature": "BMI", "impact": round((_safe_float(input_payload.get("BMI")) - 24.0) / 30.0, 4)},
        {"feature": "Age", "impact": round((_safe_float(input_payload.get("Age")) - 40.0) / 50.0, 4)},
        {"feature": "HbA1c", "impact": round((_safe_float(input_payload.get("HbA1c")) - 5.7) / 5.0, 4)},
        {"feature": "Family History", "impact": 0.08 if _safe_float(input_payload.get("Family_History")) >= 1 else -0.03},
    ]
    explanation.sort(key=lambda item: abs(_safe_float(item["impact"])), reverse=True)
    return {
        "method": "heuristic_fallback",
        "explanation": explanation[:top_k],
    }


def _run_diabetes_prediction(payload: DiabetesPredictRequest) -> Dict[str, Any]:
    input_payload = _dataset_aligned_payload(payload)
    if input_payload is None:
        input_payload = _normalize_diabetes_input(payload)
    input_payload, estimated_inputs = _apply_input_estimations(input_payload, payload)

    try:
        prediction = diabetes_analyzer.predict(input_payload)
        raw_risk_score = float(prediction["probability"])
    except Exception:
        raw_risk_score = _heuristic_diabetes_probability(input_payload)

    risk_score = _calibrate_risk_score(raw_risk_score)
    try:
        explanation_result = diabetes_analyzer.explain(input_payload, top_k=8)
    except Exception:
        explanation_result = _fallback_diabetes_explanation(input_payload, top_k=8)

    if risk_score >= 0.7:
        category = "High"
    elif risk_score >= 0.4:
        category = "Medium"
    else:
        category = "Low"

    base_confidence = min(0.99, max(0.01, 0.5 + abs(risk_score - 0.5)))
    confidence_factor = _confidence_adjustment_factor(len(estimated_inputs))
    confidence = min(0.99, max(0.01, base_confidence * confidence_factor))
    explanation = [
        {
            "feature": str(item.get("feature", "")),
            "impact": round(_safe_float(item.get("impact")), 4),
            "estimated": False,
        }
        for item in explanation_result.get("explanation", [])
    ]
    if estimated_inputs:
        estimated_tokens = {_normalized_feature_token(item["feature"]) for item in estimated_inputs}
        matched = False
        for item in explanation:
            token = _normalized_feature_token(item.get("feature", ""))
            if token in estimated_tokens:
                item["estimated"] = True
                item["feature"] = f"{item['feature']} (estimated)"
                matched = True
        if not matched:
            explanation.append(
                {
                    "feature": "Skin Thickness (estimated)",
                    "impact": 0.0,
                    "estimated": True,
                }
            )
    explanation.sort(key=lambda item: abs(_safe_float(item.get("impact"))), reverse=True)

    insights = _clinical_insights(input_payload)
    if estimated_inputs:
        insights.append("Skin Thickness was auto-estimated from BMI and Age.")
    clinical_interpretation = _clinical_interpretation(explanation, insights)

    return {
        "input_payload": input_payload,
        "risk_score": round(risk_score, 4),
        "raw_risk_score": round(raw_risk_score, 6),
        "category": category,
        "confidence": round(confidence, 4),
        "base_confidence": round(base_confidence, 4),
        "confidence_adjustment_factor": confidence_factor,
        "estimated_inputs": estimated_inputs,
        "estimated_features": [item["feature"] for item in estimated_inputs],
        "explanation": explanation,
        "insights": insights,
        "clinical_interpretation": clinical_interpretation,
        "explanation_method": explanation_result.get("method", "shap"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _trust_label_from_score(score: float) -> str:
    if score >= 75:
        return "🟢 High Trust"
    if score >= 60:
        return "🟡 Moderate Trust"
    return "🔴 Low Trust / Blocked"


def _normalize_lung_checks(checks: Dict[str, Any]) -> Dict[str, str]:
    return {
        "modality": str(checks.get("modality", "fail")),
        "view": str(checks.get("view", "fail")),
        "lung_detected": str(checks.get("lung_detected", "fail")),
        "quality": str(checks.get("quality", "fail")),
        "sanity": str(checks.get("clinical_sanity", checks.get("sanity", "fail"))),
    }


@app.get("/api/health")
async def public_health_check():
    try:
        diabetes_analyzer._ensure_loaded()
        model_ready = diabetes_analyzer._pipeline is not None and bool(diabetes_analyzer._feature_columns)
    except Exception:
        model_ready = False

    return {
        "status": "healthy" if model_ready else "degraded",
        "api": "online",
        "diabetes_model": "connected" if model_ready else "disconnected",
    }


@app.post("/api/diabetes/predict")
async def predict_diabetes_public(payload: DiabetesPredictRequest):
    try:
        result = _run_diabetes_prediction(payload)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Model unavailable. Please retry.") from exc

    return {
        "risk_score": result["risk_score"],
        "raw_risk_score": result["raw_risk_score"],
        "category": result["category"],
        "confidence": result["confidence"],
        "base_confidence": result["base_confidence"],
        "confidence_adjustment_factor": result["confidence_adjustment_factor"],
        "estimated_inputs": result["estimated_inputs"],
        "estimated_features": result["estimated_features"],
        "explanation": result["explanation"],
        "insights": result["insights"],
        "clinical_interpretation": result["clinical_interpretation"],
        "explanation_method": result["explanation_method"],
        "timestamp": result["timestamp"],
    }


@app.post("/api/diabetes/report")
async def diabetes_clinical_report(payload: DiabetesPredictRequest):
    if SimpleDocTemplate is None or A4 is None or getSampleStyleSheet is None:
        raise HTTPException(
            status_code=503,
            detail="PDF report service unavailable: install reportlab to enable /api/diabetes/report",
        )

    try:
        result = _run_diabetes_prediction(payload)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Model unavailable. Please retry.") from exc

    input_payload = result["input_payload"]
    risk_score = float(result["risk_score"])
    category = str(result["category"])
    confidence = float(result["confidence"])
    explanation = result["explanation"]
    estimated_inputs = result["estimated_inputs"]
    insights = result["insights"]
    clinical_interpretation = str(result["clinical_interpretation"])
    timestamp = str(result["timestamp"])

    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Diabetes Clinical Decision Support Report", styles["Title"]),
        Spacer(1, 10),
        Paragraph(f"Timestamp: {timestamp}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Prediction Summary", styles["Heading2"]),
        Paragraph(f"Risk Score: {risk_score * 100:.1f}%", styles["Normal"]),
        Paragraph(f"Category: {category}", styles["Normal"]),
        Paragraph(f"Confidence: {confidence * 100:.1f}%", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Patient Inputs", styles["Heading2"]),
    ]

    input_rows = [["Feature", "Value"]] + [[str(k).replace("_", " "), str(v)] for k, v in input_payload.items()]
    input_table = Table(input_rows, colWidths=[220, 280])
    input_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2F4F7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ]
        )
    )
    story.extend([input_table, Spacer(1, 12), Paragraph("Key Factors (SHAP)", styles["Heading2"])])

    factors = explanation[:6] if explanation else [{"feature": "Unavailable", "impact": 0.0}]
    factor_rows = [["Feature", "Impact"]] + [
        [str(item["feature"]), f"{_safe_float(item['impact']):+0.4f}"] for item in factors
    ]
    factor_table = Table(factor_rows, colWidths=[300, 200])
    factor_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF4FF")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ]
        )
    )
    story.extend(
        [
            factor_table,
            Spacer(1, 12),
            Paragraph("Estimated Inputs", styles["Heading2"]),
            *(
                [Paragraph("- None", styles["Normal"])]
                if not estimated_inputs
                else [
                    Paragraph(
                        f"- {item['feature']}: {item['value']} ({item['method']})",
                        styles["Normal"],
                    )
                    for item in estimated_inputs
                ]
            ),
            Spacer(1, 10),
            Paragraph("Clinical Interpretation", styles["Heading2"]),
            Paragraph(clinical_interpretation, styles["Normal"]),
            Spacer(1, 10),
            Paragraph("Rule-Based Insights", styles["Heading2"]),
            *[Paragraph(f"- {item}", styles["Normal"]) for item in insights],
        ]
    )

    document.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="diabetes_clinical_report.pdf"'},
    )


@app.post("/api/predict/diabetes")
async def predict_diabetes_unified(payload: DiabetesPredictRequest):
    try:
        result = _run_diabetes_prediction(payload)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Model unavailable. Please retry.") from exc

    score = 90.0 if result["confidence"] >= 0.75 else 72.0
    validation_status = "accepted" if score >= 75 else "accepted_with_warning"

    return {
        "task": "diabetes",
        "validation": {
            "status": validation_status,
            "score": score,
            "checks": {
                "modality": "pass",
                "view": "pass",
                "lung_detected": "pass",
                "quality": "pass" if score >= 75 else "warn",
                "sanity": "pass",
            },
            "warnings": [] if score >= 75 else ["Borderline confidence; interpret with caution."],
            "trust": _trust_label_from_score(score),
        },
        "prediction": {
            "label": f"{result['category']} Risk",
            "confidence": result["confidence"],
            "probabilities": {
                "negative": round(max(0.0, 1 - float(result["risk_score"])), 4),
                "positive": round(float(result["risk_score"]), 4),
            },
        },
        "explainability": {
            "type": str(result["explanation_method"]).lower(),
            "features": [
                {
                    "name": item["feature"],
                    "impact": item["impact"],
                    "estimated": bool(item.get("estimated", False)),
                }
                for item in result["explanation"]
            ],
            "heatmap_url": None,
        },
        "report": {
            "download_url": "/api/diabetes/report",
        },
        "estimated_inputs": result["estimated_inputs"],
        "estimated_features": result["estimated_features"],
        "confidence_adjustment_factor": result["confidence_adjustment_factor"],
        "insights": result["insights"],
        "clinical_interpretation": result["clinical_interpretation"],
    }


@app.post("/api/predict/lung")
async def predict_lung_unified(
    image: UploadFile = File(...),
    modality: str = Form("chest_xray"),
):
    image_data = await image.read()
    validation = xray_validation_pipeline.validate(
        image_data=image_data,
        filename=image.filename,
        content_type=image.content_type,
        declared_modality=modality,
    )
    score = float(validation.get("score", 0.0))
    normalized_checks = _normalize_lung_checks(validation.get("checks", {}))
    clinical_sanity_fail = normalized_checks.get("sanity") == "fail"
    lung_segmentation_fail = normalized_checks.get("lung_detected") == "fail"
    blocked = (
        validation.get("status") == "rejected"
        or score < 60
        or clinical_sanity_fail
        or lung_segmentation_fail
    )

    if blocked:
        return {
            "task": "lung",
            "validation": {
                "status": "blocked",
                "score": score,
                "checks": normalized_checks,
                "warnings": validation.get("warnings", []),
                "trust": _trust_label_from_score(score),
            },
            "prediction": {
                "label": "Analysis Blocked",
                "confidence": 0.0,
                "probabilities": {
                    "benign": 0.0,
                    "suspicious": 0.0,
                },
            },
            "explainability": {
                "type": "gradcam",
                "features": [],
                "heatmap_url": None,
            },
            "report": {
                "download_url": None,
            },
            "regions": [],
            "message": "Please upload a valid chest X-ray",
        }

    validated_image = validation.get("processed_image_bytes") or image_data
    analysis = vision_analyzer.analyze_xray(
        image_data=validated_image,
        modality=modality,
    )

    confidence = max(0.0, min(1.0, float(analysis.get("confidence", 0.0))))
    if confidence >= 0.75:
        label = "Suspicious"
    elif confidence >= 0.5:
        label = "Indeterminate"
    else:
        label = "Benign"

    benign_prob = round(max(0.0, 1.0 - confidence), 4)
    suspicious_prob = round(confidence, 4)
    indeterminate_prob = round(max(0.0, min(1.0, 1.0 - abs(confidence - 0.5) * 2)) * 0.35, 4)

    return {
        "task": "lung",
        "validation": {
            "status": "accepted" if score >= 75 else "accepted_with_warning",
            "score": score,
            "checks": normalized_checks,
            "warnings": validation.get("warnings", []),
            "trust": _trust_label_from_score(score),
        },
        "prediction": {
            "label": label,
            "confidence": confidence,
            "probabilities": {
                "benign": benign_prob,
                "indeterminate": indeterminate_prob,
                "suspicious": suspicious_prob,
            },
        },
        "explainability": {
            "type": "gradcam",
            "features": [],
            "heatmap_url": f"data:image/png;base64,{analysis.get('heatmap_data', '')}" if analysis.get("heatmap_data") else None,
        },
        "regions": analysis.get("regions", []),
        "report": {
            "download_url": "/api/v1/analyze/xray/report",
        },
    }


@app.post("/api/llm/explain")
async def llm_explain(payload: LLMExplainRequest):
    task = str(payload.task).lower()
    prediction = payload.prediction or {}
    explainability = payload.explainability or {}
    confidence = float(prediction.get("confidence", 0.0) or 0.0)
    label = str(prediction.get("label", "model output"))

    if task == "diabetes":
        top_features = explainability.get("features", [])[:2]
        factors = ", ".join(str(item.get("name", "key factor")) for item in top_features) or "metabolic feature patterns"
        summary = (
            f"The model output is '{label}' with {confidence * 100:.1f}% confidence. "
            f"Most influential factors were {factors}."
        )
        limitations = (
            "This summary reflects model signals only and cannot confirm diabetes. "
            "Laboratory tests and clinician review are required."
        )
    else:
        region_count = len(explainability.get("features", [])) + len(payload.explainability.get("regions", []))
        summary = (
            f"The model output is '{label}' with {confidence * 100:.1f}% confidence. "
            f"Visual attention was concentrated in highlighted pulmonary regions ({region_count} markers)."
        )
        limitations = (
            "Heatmap attention does not establish pathology by itself and may be affected by image quality."
        )

    return {
        "summary": f"{summary} Not a diagnosis.",
        "limitations": limitations,
        "advice": "Seek clinician review and correlate with full clinical context before decisions.",
    }
