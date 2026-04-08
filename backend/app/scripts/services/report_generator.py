from datetime import datetime, timezone
from typing import Dict, List, Any


class ReportGenerator:
    def symptom_report(
        self,
        request_id: str,
        top_prediction: Dict[str, Any],
        fairness_status: str,
        safety_message: str,
        recommendations: List[str],
    ) -> str:
        return "\n".join(
            [
                "Responsible AI Symptom Report",
                f"Request ID: {request_id}",
                f"Timestamp: {datetime.now(timezone.utc).isoformat()}",
                f"Top Condition: {top_prediction.get('condition', 'unknown')}",
                f"Probability: {top_prediction.get('probability', 0.0) * 100:.1f}%",
                f"Fairness Status: {fairness_status}",
                f"Safety: {safety_message}",
                "Recommendations:",
                *[f"- {r}" for r in recommendations],
                "Disclaimer: AI outputs are decision support only.",
            ]
        )

    def xray_report(
        self,
        request_id: str,
        condition: str,
        confidence: float,
        fairness_status: str,
        safety_status: str,
        recommendations: List[str],
    ) -> str:
        return "\n".join(
            [
                "Responsible AI X-Ray Report",
                f"Request ID: {request_id}",
                f"Timestamp: {datetime.now(timezone.utc).isoformat()}",
                f"Condition: {condition}",
                f"Confidence: {confidence * 100:.1f}%",
                f"Fairness Status: {fairness_status}",
                f"Safety Status: {safety_status}",
                "Recommendations:",
                *[f"- {r}" for r in recommendations],
                "Disclaimer: AI outputs are decision support only.",
            ]
        )


report_generator = ReportGenerator()
