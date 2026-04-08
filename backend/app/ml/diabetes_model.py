from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd


class DiabetesAnalyzer:
    def __init__(self):
        self.model_name = "diabetes_risk_model"
        self.model_version = "1.1.0"
        self._loaded = False
        self._artifact = None
        self._pipeline = None
        self._feature_columns: List[str] = []
        self._classes: List[int] = []
        self._threshold: float = 0.5
        self._positive_class: int = 1
        self._shap = None

    def _artifact_candidates(self) -> List[Path]:
        root = Path(__file__).resolve().parents[3]
        return [
            root / "models" / "diabetes" / "diabetes_status_model.joblib",
            root / "backend" / "models" / "diabetes" / "diabetes_status_model.joblib",
        ]

    def _ensure_loaded(self):
        if self._loaded:
            return

        artifact_path: Optional[Path] = None
        for candidate in self._artifact_candidates():
            if candidate.exists():
                artifact_path = candidate
                break

        if artifact_path is not None:
            try:
                artifact = joblib.load(artifact_path)
                self._artifact = artifact
                self._pipeline = artifact.get("pipeline") or artifact.get("model")
                self._feature_columns = artifact.get("feature_columns", [])
                self._classes = artifact.get("classes", [])
                self._threshold = float(artifact.get("threshold", 0.5))
                self._positive_class = int(artifact.get("positive_class", 1))
                self.model_name = "diabetes_status_model"
                self.model_version = "trained-artifact"
            except Exception:
                self._artifact = None
                self._pipeline = None

        self._loaded = True
        if self._shap is None:
            try:
                import shap

                self._shap = shap
            except Exception:
                self._shap = None

    @staticmethod
    def _normalized_key(name: str) -> str:
        return "".join(ch for ch in str(name).lower() if ch.isalnum())

    @staticmethod
    def _derive_bmi_category(bmi: float) -> str:
        if bmi < 18.5:
            return "Underweight"
        if bmi < 25:
            return "Normal"
        if bmi < 30:
            return "Overweight"
        return "Obese"

    @staticmethod
    def _derive_age_group(age: float) -> str:
        if age < 30:
            return "18-29"
        if age < 45:
            return "30-44"
        if age < 60:
            return "45-59"
        return "60+"

    def _expand_clinical_payload(self, payload: Dict[str, float]) -> Dict[str, float | str]:
        """Expand 8-field dashboard inputs into training-schema model features."""
        glucose = float(payload.get("glucose", 0.0) or 0.0)
        bmi = float(payload.get("bmi", 0.0) or 0.0)
        age = float(payload.get("age", 0.0) or 0.0)
        blood_pressure = float(payload.get("blood_pressure", 0.0) or 0.0)
        insulin = float(payload.get("insulin", 0.0) or 0.0)
        pregnancies = float(payload.get("pregnancies", 0.0) or 0.0)
        dpf = float(payload.get("diabetes_pedigree_function", 0.0) or 0.0)

        postprandial_glucose = min(400.0, glucose * 1.35)
        frequent_urination = 1 if glucose >= 140 else 0
        excessive_thirst = 1 if glucose >= 145 else 0
        fatigue = 1 if bmi >= 30 else 0
        blurred_vision = 1 if glucose >= 180 else 0
        weight_loss = 1 if glucose >= 160 and bmi < 25 else 0
        symptom_burden = (
            frequent_urination + excessive_thirst + fatigue + blurred_vision + weight_loss
        )

        return {
            "Age": age,
            "Gender": "Female" if pregnancies > 0 else "Male",
            "BMI": bmi,
            "Family_History": 1 if dpf >= 0.5 else 0,
            "Physical_Activity": "Low" if bmi >= 30 else "Medium",
            "Diet_Type": "Mixed",
            "Sleep_Hours": 6.5,
            "Fasting_Glucose": glucose,
            "Postprandial_Glucose": postprandial_glucose,
            "HbA1c": max(4.5, min(14.0, 4.0 + glucose / 40.0)),
            "Blood_Pressure": blood_pressure,
            "Cholesterol": 190.0 + max(0.0, bmi - 25.0) * 1.8,
            "Insulin": insulin,
            "Frequent_Urination": frequent_urination,
            "Excessive_Thirst": excessive_thirst,
            "Fatigue": fatigue,
            "Blurred_Vision": blurred_vision,
            "Weight_Loss": weight_loss,
            "BMI_Category": self._derive_bmi_category(bmi),
            "Glucose_Ratio_PP_F": postprandial_glucose / glucose if glucose > 0 else 1.0,
            "Symptom_Burden": symptom_burden,
            "Age_Group": self._derive_age_group(age),
        }

    def _prepare_payload_for_model(self, payload: Dict[str, float]) -> Dict[str, float | str]:
        normalized_keys = {self._normalized_key(k) for k in payload.keys()}
        expected_keys = {
            "glucose",
            "bmi",
            "age",
            "bloodpressure",
            "insulin",
            "pregnancies",
            "diabetespedigreefunction",
        }

        if expected_keys.issubset(normalized_keys):
            return self._expand_clinical_payload(payload)

        return payload

    def _artifact_probability(self, payload: Dict[str, float]) -> float:
        if self._pipeline is None or not self._feature_columns:
            raise RuntimeError("Model artifact is unavailable")

        prepared_payload = self._prepare_payload_for_model(payload)
        df = pd.DataFrame([self._build_model_row(prepared_payload)])
        return self._predict_probability_for_df(df)

    def _build_model_row(self, prepared_payload: Dict[str, Any]) -> Dict[str, Any]:
        if self._pipeline is None or not self._feature_columns:
            raise RuntimeError("Model artifact is unavailable")

        normalized_payload = {
            self._normalized_key(key): value
            for key, value in prepared_payload.items()
            if value is not None
        }

        row = {}
        for col in self._feature_columns:
            value = prepared_payload.get(col)
            if value is None:
                value = normalized_payload.get(self._normalized_key(col))
            row[col] = value

        return row

    def _resolve_positive_index(self) -> int:
        if self._pipeline is None:
            return 1
        classes = list(self._classes) if self._classes else list(self._pipeline.classes_)
        if self._positive_class in classes:
            return classes.index(self._positive_class)
        return max(0, len(classes) - 1)

    def _predict_probability_for_df(self, df: pd.DataFrame) -> float:
        if self._pipeline is None:
            raise RuntimeError("Model artifact is unavailable")
        try:
            proba = self._pipeline.predict_proba(df)[0]
        except AttributeError:
            # Some persisted sklearn artifacts can miss newer attrs (for example
            # LogisticRegression.multi_class) across version boundaries.
            repaired = self._repair_pipeline_compatibility(self._pipeline)
            if repaired:
                proba = self._pipeline.predict_proba(df)[0]
            else:
                raise RuntimeError("Loaded model is incompatible with current runtime")
        except Exception:
            raise RuntimeError("Model inference failed")

        classes = list(self._classes) if self._classes else list(self._pipeline.classes_)

        if self._positive_class in classes:
            idx = classes.index(self._positive_class)
            return float(proba[idx])

        max_idx = int(proba.argmax())
        return float(proba[max_idx])

    @staticmethod
    def _default_value_for_feature(feature_name: str, current_value: Any) -> Any:
        if isinstance(current_value, str):
            defaults = {
                "Gender": "Female",
                "Physical_Activity": "Medium",
                "Diet_Type": "Mixed",
                "BMI_Category": "Normal",
                "Age_Group": "30-44",
            }
            return defaults.get(feature_name, current_value)

        lname = str(feature_name).lower()
        if "glucose" in lname:
            return 110.0
        if "hba1c" in lname:
            return 5.7
        if "blood_pressure" in lname:
            return 75.0
        if "cholesterol" in lname:
            return 180.0
        if "insulin" in lname:
            return 80.0
        if "bmi" in lname:
            return 24.0
        if "sleep" in lname:
            return 7.0
        if "age" in lname:
            return 40.0
        if "ratio" in lname:
            return 1.2
        if "symptom" in lname:
            return 1.0
        if "history" in lname:
            return 0.0
        if any(token in lname for token in ["fatigue", "thirst", "urination", "vision", "weight_loss"]):
            return 0.0
        return 0.0

    @staticmethod
    def _display_feature_name(feature_name: str) -> str:
        return str(feature_name).replace("_", " ")

    def explain(self, payload: Dict[str, float], top_k: int = 10) -> Dict[str, Any]:
        self._ensure_loaded()
        if self._pipeline is None or not self._feature_columns:
            raise RuntimeError("Model artifact is unavailable")
        if self._shap is None:
            raise RuntimeError("SHAP is not installed")

        prepared_payload = self._prepare_payload_for_model(payload)
        input_row = self._build_model_row(prepared_payload)
        baseline_row = {
            feature: self._default_value_for_feature(feature, input_row.get(feature))
            for feature in self._feature_columns
        }
        df_input = pd.DataFrame([input_row], columns=self._feature_columns)
        df_background = pd.DataFrame([baseline_row], columns=self._feature_columns)
        positive_idx = self._resolve_positive_index()

        shap_values_vector = None
        method = "shap"

        try:
            explainer = self._shap.Explainer(self._pipeline, df_background, feature_names=self._feature_columns)
            shap_values = explainer(df_input)
            values = np.array(shap_values.values)
            if values.ndim == 3:
                shap_values_vector = values[0, :, positive_idx]
                method = "tree_explainer"
            elif values.ndim == 2:
                shap_values_vector = values[0]
                method = "model_explainer"
        except Exception:
            def predict_positive_probability(rows):
                if isinstance(rows, pd.DataFrame):
                    frame = rows.copy()
                else:
                    frame = pd.DataFrame(rows, columns=self._feature_columns)
                probabilities = self._pipeline.predict_proba(frame)
                return probabilities[:, positive_idx]

            explainer = self._shap.Explainer(
                predict_positive_probability,
                df_background,
                feature_names=self._feature_columns,
            )
            shap_values = explainer(df_input)
            values = np.array(shap_values.values)
            if values.ndim == 2:
                shap_values_vector = values[0]
                method = "kernel_explainer"

        if shap_values_vector is None:
            baseline_probability = self._predict_probability_for_df(df_input)
            deltas: list[float] = []
            for feature in self._feature_columns:
                counterfactual_row = dict(input_row)
                counterfactual_row[feature] = baseline_row[feature]
                counterfactual_df = pd.DataFrame([counterfactual_row], columns=self._feature_columns)
                counterfactual_probability = self._predict_probability_for_df(counterfactual_df)
                deltas.append(float(baseline_probability - counterfactual_probability))
            shap_values_vector = np.array(deltas)
            method = "local_sensitivity_fallback"

        contributions = [
            {
                "feature": self._display_feature_name(feature),
                "impact": float(value),
            }
            for feature, value in zip(self._feature_columns, shap_values_vector)
            if np.isfinite(value)
        ]
        contributions.sort(key=lambda item: abs(item["impact"]), reverse=True)

        return {
            "method": method,
            "explanation": contributions[:top_k],
        }

    @staticmethod
    def _repair_pipeline_compatibility(pipeline) -> bool:
        """Best-effort compatibility shim for deserialized sklearn estimators."""
        repaired_any = False

        def repair_estimator(estimator) -> bool:
            repaired = False

            if estimator is None:
                return False

            if estimator.__class__.__name__ == "LogisticRegression" and not hasattr(estimator, "multi_class"):
                estimator.multi_class = "auto"
                repaired = True

            if hasattr(estimator, "steps"):
                for _, step in estimator.steps:
                    repaired = repair_estimator(step) or repaired

            if hasattr(estimator, "transformers"):
                for _, transformer, _ in estimator.transformers:
                    repaired = repair_estimator(transformer) or repaired

            if hasattr(estimator, "estimators"):
                for sub_estimator in estimator.estimators:
                    repaired = repair_estimator(sub_estimator) or repaired

            return repaired

        try:
            repaired_any = repair_estimator(pipeline)
        except Exception:
            return False

        return repaired_any

    def predict(self, payload: Dict[str, float]) -> Dict[str, object]:
        self._ensure_loaded()

        probability = self._artifact_probability(payload)
        used_features = [k for k in payload.keys() if payload.get(k) is not None]

        return {
            "probability": min(max(float(probability), 0.001), 0.999),
            "used_features": used_features,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "threshold": self._threshold,
            "positive_class": self._positive_class,
        }


# Singleton used by API routes.
diabetes_analyzer = DiabetesAnalyzer()
