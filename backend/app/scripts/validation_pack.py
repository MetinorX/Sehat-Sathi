import json
from pathlib import Path

import requests


BASE_URL = "http://127.0.0.1:8000/api/v1"


def run_validation_pack(output_path: str = "backend/validation_results.json"):
    results = []

    symptom_payload = {
        "body_system": "respiratory",
        "symptoms": [{"name": "cough", "severity": 3}, {"name": "shortness_of_breath", "severity": 4}],
        "duration": "acute",
        "demographics": {"age_group": "45-60", "sex": "male", "ethnicity": "asian"},
        "consent_given": True,
        "medical_history": ["smoker"],
    }

    test_cases = [
        ("health", "GET", f"{BASE_URL}/health", None),
        ("symptom_prediction", "POST", f"{BASE_URL}/predict/symptoms", symptom_payload),
        ("fairness_metrics", "GET", f"{BASE_URL}/fairness/metrics", None),
        ("audit_status", "GET", f"{BASE_URL}/audit/status", None),
        ("gdpr", "GET", f"{BASE_URL}/fairness/gdpr-compliance", None),
    ]

    for name, method, url, payload in test_cases:
        try:
            if method == "GET":
                resp = requests.get(url, timeout=30)
            else:
                resp = requests.post(url, json=payload, timeout=30)

            results.append(
                {
                    "name": name,
                    "status_code": resp.status_code,
                    "ok": 200 <= resp.status_code < 300,
                    "body": resp.json() if "application/json" in resp.headers.get("content-type", "") else resp.text,
                }
            )
        except Exception as exc:
            results.append({"name": name, "ok": False, "error": str(exc)})

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Saved validation results to {out}")


if __name__ == "__main__":
    run_validation_pack()
