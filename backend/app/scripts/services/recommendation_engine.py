from typing import Dict, List, Any


class RecommendationEngine:
    def recommendations_for_symptom_prediction(
        self,
        top_condition: str,
        confidence: float,
        triage_color: str,
        guideline_steps: List[str],
    ) -> List[str]:
        recs: List[str] = []

        if triage_color == "red":
            recs.append("Immediate emergency evaluation is required")
        elif triage_color == "yellow":
            recs.append("Urgent clinical review within 2 hours")
        else:
            recs.append("Routine clinical follow-up is recommended")

        if confidence < 0.6:
            recs.append("Low confidence prediction: mandatory physician review")

        if top_condition:
            recs.append(f"Primary suspected condition: {top_condition}")

        recs.extend(guideline_steps[:3])
        return list(dict.fromkeys(recs))[:6]

    def recommendations_for_xray(
        self,
        confidence: float,
        requires_human_review: bool,
        findings: List[Dict[str, Any]],
    ) -> List[str]:
        recs: List[str] = []

        if requires_human_review:
            recs.append("Mandatory radiologist review")

        if confidence >= 0.75:
            recs.append("Consider urgent CT chest and oncology consultation")
        elif confidence >= 0.5:
            recs.append("Recommend follow-up imaging and specialist review")
        else:
            recs.append("No strong malignant pattern; continue routine monitoring")

        if any("nodule" in f.get("description", "").lower() for f in findings):
            recs.append("Track nodule size progression in follow-up scans")

        return list(dict.fromkeys(recs))[:6]


recommendation_engine = RecommendationEngine()
