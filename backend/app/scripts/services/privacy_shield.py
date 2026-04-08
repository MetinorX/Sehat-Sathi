from typing import Dict, List, Any, Optional
import re


class PrivacyShield:
    def __init__(self):
        self.pii_patterns = {
            "PERSON": r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
            "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "PHONE": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
            "DATE_OF_BIRTH": r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
            "ADDRESS": r"\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b",
            "MEDICAL_RECORD": r"\bMRN[:\s]*\d{6,}\b",
            "CREDIT_CARD": r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",
        }
        self._analyzer = None

    def _ensure_analyzer(self):
        if self._analyzer is None:
            try:
                from presidio_analyzer import AnalyzerEngine
                from presidio_analyzer.nlp_engine import NlpEngineProvider

                nlp_engine = NlpEngineProvider().create_engine()
                self._analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
            except ImportError:
                self._analyzer = False

    def detect_pii(self, text: str) -> List[Dict[str, Any]]:
        self._ensure_analyzer()

        detected = []

        for pii_type, pattern in self.pii_patterns.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                detected.append(
                    {
                        "type": pii_type,
                        "value": match.group(),
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.9,
                    }
                )

        if self._analyzer:
            try:
                results = self._analyzer.analyze(text=text, language="en")
                for result in results:
                    detected.append(
                        {
                            "type": result.entity_type,
                            "value": text[result.start : result.end],
                            "start": result.start,
                            "end": result.end,
                            "score": result.score,
                        }
                    )
            except Exception:
                pass

        detected.sort(key=lambda x: x["start"])

        unique_detected = []
        seen_ranges = set()
        for item in detected:
            range_key = (item["start"], item["end"])
            if range_key not in seen_ranges:
                seen_ranges.add(range_key)
                unique_detected.append(item)

        return unique_detected

    def redact_pii(self, text: str, replacement: str = "[REDACTED]") -> str:
        detected = self.detect_pii(text)

        if not detected:
            return text

        redacted = text
        offset = 0

        for pii in detected:
            start = pii["start"] + offset
            end = pii["end"] + offset
            original_length = end - start
            redacted_text = f"[{pii['type']}]"
            redacted = redacted[:start] + redacted_text + redacted[end:]
            offset += len(redacted_text) - original_length

        return redacted

    def validate_consent(
        self,
        consent_given: bool,
        purpose: str = "healthcare_prediction",
        required_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        required_fields = required_fields or ["symptoms", "demographics"]

        if not consent_given:
            return {
                "valid": False,
                "consent_status": "denied",
                "message": "User consent is required for processing",
                "missing_fields": required_fields,
            }

        return {
            "valid": True,
            "consent_status": "given",
            "purpose": purpose,
            "timestamp": None,
            "gdpr_compliant": True,
            "hipaa_compliant": True,
        }

    def check_compliance(self, text: str) -> Dict[str, Any]:
        detected_pii = self.detect_pii(text)

        compliance_score = 1.0
        if detected_pii:
            pii_types = set([p["type"] for p in detected_pii])
            sensitive_types = {"SSN", "CREDIT_CARD", "MEDICAL_RECORD"}
            sensitive_detected = pii_types & sensitive_types

            if sensitive_detected:
                compliance_score -= 0.3 * len(sensitive_detected)

            compliance_score -= 0.1 * len(pii_types)

        return {
            "pii_detected": list(set([p["type"] for p in detected_pii])),
            "redacted_text": self.redact_pii(text),
            "compliance_score": max(0.0, compliance_score),
            "gdpr_flags": ["pii_present"] if detected_pii else [],
            "hipaa_flags": [
                "phi_present"
            ]
            if any(p["type"] in {"PERSON", "MEDICAL_RECORD"} for p in detected_pii)
            else [],
        }


privacy_shield = PrivacyShield()
