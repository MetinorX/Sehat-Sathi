from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.services import fairness_guardian, privacy_shield

router = APIRouter()


class PrivacyCheckRequest(BaseModel):
    text: str


class PrivacyCheckResponse(BaseModel):
    pii_detected: List[str]
    redacted_text: str
    compliance_score: float


@router.get("/dashboard")
async def get_fairness_dashboard() -> Dict[str, Any]:
    dashboard_data = fairness_guardian.get_dashboard_data()
    return dashboard_data


@router.get("/metrics")
async def get_fairness_metrics() -> Dict[str, Any]:
    bias_report = fairness_guardian.detect_bias()
    return {
        "overall_status": bias_report.get("overall_status"),
        "disparity_score": bias_report.get("disparity_score"),
        "threshold": bias_report.get("threshold"),
        "alerts": bias_report.get("alerts", []),
    }


@router.post("/check", response_model=PrivacyCheckResponse)
async def check_privacy(request: PrivacyCheckRequest) -> PrivacyCheckResponse:
    compliance = privacy_shield.check_compliance(request.text)
    
    return PrivacyCheckResponse(
        pii_detected=compliance.get("pii_detected", []),
        redacted_text=compliance.get("redacted_text", request.text),
        compliance_score=compliance.get("compliance_score", 1.0)
    )


@router.post("/validate-consent")
async def validate_consent(
    consent_given: bool,
    purpose: str = "healthcare_prediction"
) -> Dict[str, Any]:
    result = privacy_shield.validate_consent(
        consent_given=consent_given,
        purpose=purpose
    )
    
    if not result["valid"]:
        raise HTTPException(
            status_code=403,
            detail="Consent is required for processing"
        )
    
    return result


@router.get("/gdpr-compliance")
async def get_gdpr_status() -> Dict[str, Any]:
    return {
        "gdpr_compliant": True,
        "data_retention": "None - Zero data storage",
        "pii_detection_enabled": True,
        "consent_required": True,
        "right_to_explanation": True,
    }


@router.get("/hipaa-compliance")
async def get_hipaa_status() -> Dict[str, Any]:
    return {
        "hipaa_compliant": True,
        "phi_protection": True,
        "access_controls": True,
        "audit_logging": True,
        "encryption_at_rest": True,
        "encryption_in_transit": True,
    }
