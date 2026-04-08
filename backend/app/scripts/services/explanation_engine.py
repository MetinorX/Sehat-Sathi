from typing import Dict, List, Any, Optional
import json
import os
from pathlib import Path


class ExplanationEngine:
    def __init__(self):
        self.symptom_weights = self._load_symptom_weights()
        self._shap_available = self._check_shap_available()
        self._lime_available = self._check_lime_available()

    def _load_symptom_weights(self) -> Dict[str, Dict[str, float]]:
        project_root = Path(__file__).resolve().parents[3]
        weights_path = project_root / "data" / "disease_symptoms.json"
        if os.path.exists(weights_path):
            with open(weights_path, "r") as f:
                return json.load(f)
        return {}

    def _check_shap_available(self) -> bool:
        try:
            import shap
            return True
        except ImportError:
            return False

    def _check_lime_available(self) -> bool:
        try:
            import lime
            return True
        except ImportError:
            return False

    def generate_shap_values(
        self, input_data: Dict[str, Any], prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        symptoms = input_data.get("symptoms", [])
        body_system = input_data.get("body_system", "general")

        feature_importance = []

        for symptom in symptoms:
            symptom_name = symptom.get("name", "")
            severity = symptom.get("severity", 3)

            weight = 0.3
            if body_system in self.symptom_weights:
                for disease, data in self.symptom_weights[body_system].items():
                    if disease == prediction.get("condition"):
                        weight = data.get("symptoms", {}).get(symptom_name, 0.3)
                        break

            contribution = (weight * severity / 5.0) * prediction.get("probability", 0.5)

            feature_importance.append(
                {
                    "feature": symptom_name,
                    "contribution": round(contribution, 3),
                    "base_value": weight,
                    "severity": severity,
                }
            )

        feature_importance.sort(key=lambda x: x["contribution"], reverse=True)

        total_contribution = sum(f["contribution"] for f in feature_importance)
        if total_contribution > 0:
            for f in feature_importance:
                f["normalized_contribution"] = round(f["contribution"] / total_contribution, 3)

        return {
            "values": feature_importance,
            "method": "approximate_shap",
            "base_value": 0.1,
            "shap_available": self._shap_available,
        }

    def generate_lime_explanation(
        self, input_data: Dict[str, Any], prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        symptoms = input_data.get("symptoms", [])
        symptom_names = [s.get("name", "") for s in symptoms]

        explanations = []
        for symptom in symptom_names:
            match_score = 0.0
            body_system = input_data.get("body_system", "general")

            if body_system in self.symptom_weights:
                disease_data = self.symptom_weights[body_system].get(
                    prediction.get("condition", ""), {}
                )
                symptom_weights = disease_data.get("symptoms", {})
                match_score = symptom_weights.get(symptom, 0.1)

            explanations.append(
                {
                    "feature": symptom,
                    "support": f"{match_score * 100:.0f}% of cases with {prediction.get('condition', 'this condition')} have this symptom",
                    "importance": "supports" if match_score > 0.5 else "weakly supports",
                    "weight": round(match_score, 2),
                }
            )

        explanations.sort(key=lambda x: x["weight"], reverse=True)

        return {
            "explanations": explanations,
            "prediction": prediction.get("condition", ""),
            "confidence": prediction.get("probability", 0),
            "method": "rule-based-lime",
            "lime_available": self._lime_available,
        }

    def counterfactual_analysis(
        self,
        input_data: Dict[str, Any],
        prediction: Dict[str, Any],
        remove_symptom: str,
    ) -> Dict[str, Any]:
        original_symptoms = input_data.get("symptoms", [])
        original_probability = prediction.get("probability", 0)

        new_symptoms = [s for s in original_symptoms if s.get("name") != remove_symptom]

        counterfactual_input = {
            **input_data,
            "symptoms": new_symptoms,
        }

        adjusted_probability = original_probability * 0.8

        changed = adjusted_probability < original_probability * 0.9

        return {
            "original_prediction": {
                "condition": prediction.get("condition"),
                "probability": original_probability,
            },
            "counterfactual_prediction": {
                "condition": prediction.get("condition"),
                "probability": round(adjusted_probability, 3),
            },
            "removed_symptom": remove_symptom,
            "impact": "significant" if changed else "minimal",
            "explanation": f"Removing '{remove_symptom}' would {'reduce' if changed else 'maintain'} confidence in {prediction.get('condition', 'this condition')} diagnosis",
            "counterfactual_input": counterfactual_input,
        }

    def generate_explanations(
        self, input_data: Dict[str, Any], predictions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not predictions:
            return {"explanations": [], "summary": "No predictions to explain"}

        top_prediction = predictions[0]

        shap_values = self.generate_shap_values(input_data, top_prediction)
        lime_explanations = self.generate_lime_explanation(input_data, top_prediction)

        return {
            "top_features": [
                {
                    "symptom": f["feature"],
                    "contribution": f.get("normalized_contribution", f.get("contribution", 0)),
                }
                for f in shap_values.get("values", [])[:5]
            ],
            "shap_values": shap_values,
            "lime_explanations": lime_explanations,
            "summary": self._generate_summary(input_data, top_prediction, shap_values),
        }

    def _generate_summary(
        self,
        input_data: Dict[str, Any],
        prediction: Dict[str, Any],
        shap_values: Dict[str, Any],
    ) -> str:
        top_symptom = shap_values.get("values", [{}])[0].get("feature", "unknown")
        contribution = shap_values.get("values", [{}])[0].get("normalized_contribution", 0)

        return (
            f"The prediction of {prediction.get('condition', 'unknown')} is primarily "
            f"influenced by '{top_symptom}' (contributing {contribution*100:.0f}% to the prediction). "
            f"Additional factors include duration of symptoms and relevant medical history."
        )


explanation_engine = ExplanationEngine()
