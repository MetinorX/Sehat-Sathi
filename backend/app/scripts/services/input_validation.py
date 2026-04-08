from typing import Dict, Any


class InputValidation:
    ALLOWED_MODALITIES = {"chest_xray", "ct", "mri", "ultrasound"}

    def validate_symptom_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        errors = []

        symptoms = payload.get("symptoms", [])
        if not symptoms:
            errors.append("At least one symptom is required")

        for idx, symptom in enumerate(symptoms):
            sev = symptom.get("severity", 0)
            if sev < 1 or sev > 5:
                errors.append(f"symptoms[{idx}].severity must be between 1 and 5")

        if not payload.get("body_system"):
            errors.append("body_system is required")

        return {"valid": len(errors) == 0, "errors": errors}

    def validate_xray_request(self, modality: str, image_size_bytes: int) -> Dict[str, Any]:
        errors = []

        if modality not in self.ALLOWED_MODALITIES:
            errors.append(f"Unsupported modality: {modality}")

        if image_size_bytes <= 0:
            errors.append("Image payload is empty")

        if image_size_bytes > 10 * 1024 * 1024:
            errors.append("Image file too large (max 10MB)")

        return {"valid": len(errors) == 0, "errors": errors}

    def validate_diabetes_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        errors = []

        required = ["glucose", "bmi", "age"]
        for field in required:
            if field not in payload or payload[field] is None:
                errors.append(f"{field} is required")

        glucose = payload.get("glucose")
        if glucose is not None and float(glucose) <= 0:
            errors.append("glucose must be > 0")

        bmi = payload.get("bmi")
        if bmi is not None and float(bmi) <= 0:
            errors.append("bmi must be > 0")

        age = payload.get("age")
        if age is not None and int(age) <= 0:
            errors.append("age must be > 0")

        return {"valid": len(errors) == 0, "errors": errors}


input_validation = InputValidation()
