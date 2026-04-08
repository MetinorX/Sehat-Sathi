import json
from pathlib import Path
from typing import Dict, List, Any, Optional


class SafetyGuardrails:
    EMERGENCY_PATTERNS = [
        {"symptoms": ["chest_pain", "shortness_of_breath"], "condition": "possible_mi", "severity": "critical"},
        {"symptoms": ["chest_pain", "sweating", "nausea"], "condition": "possible_acute_coronary", "severity": "critical"},
        {"symptoms": ["difficulty_speaking", "numbness", "confusion"], "condition": "possible_stroke", "severity": "critical"},
        {"symptoms": ["headache", "stiffness", "fever", "sensitivity_to_light"], "condition": "possible_meningitis", "severity": "critical"},
        {"symptoms": ["severe_bleeding"], "condition": "hemorrhage", "severity": "critical"},
        {"symptoms": ["unconsciousness"], "condition": "unresponsive", "severity": "critical"},
        {"symptoms": ["shortness_of_breath", "wheezing", "swelling"], "condition": "possible_anaphylaxis", "severity": "critical"},
        {"symptoms": ["seizures"], "condition": "active_seizure", "severity": "high"},
    ]

    HIGH_RISK_CONDITIONS = [
        "Myocardial Infarction",
        "Stroke",
        "Meningitis",
        "Sepsis",
        "Pulmonary Embolism",
        "Anaphylaxis",
    ]

    DISCLAIMER = (
        "This is an AI-generated preliminary assessment and is NOT a substitute "
        "for professional medical advice, diagnosis, or treatment. Always seek "
        "the advice of your physician or other qualified health provider with any "
        "questions you may have regarding a medical condition."
    )

    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
        self.high_confidence_threshold = 0.8
        self._load_policy()

    def _load_policy(self):
        policy_path = Path(__file__).resolve().parents[1] / "config" / "safety_policy.json"
        if not policy_path.exists():
            return

        try:
            policy = json.loads(policy_path.read_text(encoding="utf-8"))
            self.confidence_threshold = float(policy.get("confidence_threshold", self.confidence_threshold))
            self.high_confidence_threshold = float(policy.get("high_confidence_threshold", self.high_confidence_threshold))
        except Exception:
            # Keep defaults if policy file is malformed.
            return

    def check_confidence(
        self, probability: float, threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        threshold = threshold or self.confidence_threshold

        if probability >= self.high_confidence_threshold:
            level = "high"
        elif probability >= threshold:
            level = "medium"
        else:
            level = "low"

        status = "ACCEPTABLE" if level != "low" else "REVIEW_REQUIRED"

        return {
            "probability": probability,
            "confidence_level": level,
            "status": status,
            "threshold": threshold,
            "requires_review": level == "low",
        }

    def check_emergency(self, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        symptom_names = set(s["name"].lower().replace(" ", "_") for s in symptoms)

        emergency_flags = []

        for pattern in self.EMERGENCY_PATTERNS:
            pattern_symptoms = set(s.lower().replace(" ", "_") for s in pattern["symptoms"])
            matching = symptom_names & pattern_symptoms

            if len(matching) >= 2:
                emergency_flags.append(
                    {
                        "condition": pattern["condition"],
                        "severity": pattern["severity"],
                        "matched_symptoms": list(matching),
                    }
                )

        is_emergency = any(f["severity"] == "critical" for f in emergency_flags)

        return {
            "is_emergency": is_emergency,
            "emergency_flags": emergency_flags,
            "recommended_action": "IMMEDIATE_MEDICAL_ATTENTION"
            if is_emergency
            else "consult_clinician",
        }

    def generate_disclaimer(self) -> str:
        return self.DISCLAIMER

    def triage_severity(
        self,
        symptoms: List[Dict[str, Any]],
        predictions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        emergency_check = self.check_emergency(symptoms)
        is_emergency = emergency_check["is_emergency"]

        if is_emergency:
            triage_color = "red"
            message = "EMERGENCY: Immediate medical attention required"
        elif any(s.get("severity", 0) >= 4 for s in symptoms):
            triage_color = "yellow"
            message = "URGENT: Clinical evaluation recommended within 2 hours"
        else:
            triage_color = "green"
            message = "NON-URGENT: Schedule routine appointment"

        high_risk_conditions = [
            p["condition"]
            for p in predictions
            if p["condition"] in self.HIGH_RISK_CONDITIONS
        ]

        if high_risk_conditions and not is_emergency:
            triage_color = "yellow"
            message = f"URGENT: Potential high-risk conditions detected. Review required."

        return {
            "triage_color": triage_color,
            "message": message,
            "is_emergency": is_emergency,
            "requires_human_review": triage_color in ["red", "yellow"],
            "emergency_flags": emergency_check["emergency_flags"],
        }

    def validate_output(self, predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
        warnings = []

        for pred in predictions:
            confidence_check = self.check_confidence(pred.get("probability", 0))
            if confidence_check["requires_review"]:
                warnings.append(
                    f"Low confidence ({pred.get('probability', 0):.2f}) for {pred.get('condition', 'unknown')}"
                )

        if any(p.get("condition") in self.HIGH_RISK_CONDITIONS for p in predictions):
            warnings.append("High-risk condition predicted. Human review mandatory.")

        return {
            "valid": len(warnings) == 0,
            "warnings": warnings,
            "disclaimer": self.generate_disclaimer(),
        }


safety_guardrails = SafetyGuardrails()
