import json
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app


def run_checkup() -> int:
    client = TestClient(app)
    issues = []

    route_paths = {route.path for route in app.routes}
    expected_routes = {
        "/api/v1/health",
        "/api/v1/predict/diabetes",
        "/api/v1/analyze/xray",
        "/api/v1/audit/status",
    }
    missing_routes = sorted(expected_routes - route_paths)
    if missing_routes:
        issues.append(f"Missing required routes: {missing_routes}")

    health = client.get("/api/v1/health")
    if health.status_code != 200:
        issues.append(f"Health endpoint failed: {health.status_code}")
    else:
        payload = health.json()
        expected = {"diabetes", "lung_cancer_xray"}
        supported = set(payload.get("supported_pipelines", []))
        if expected != supported:
            issues.append(f"Unexpected supported_pipelines: {sorted(supported)}")

    diabetes_payload = {
        "glucose": 145,
        "bmi": 31.2,
        "age": 52,
        "blood_pressure": 82,
        "insulin": 130,
        "consent_given": True,
        "demographics": {
            "age_group": "45-60",
            "sex": "female",
            "ethnicity": "asian",
        },
    }

    diabetes = client.post("/api/v1/predict/diabetes", json=diabetes_payload)
    if diabetes.status_code != 200:
        issues.append(f"Diabetes endpoint failed: {diabetes.status_code} {diabetes.text}")
    else:
        body = diabetes.json()
        required_keys = [
            "pipeline",
            "prediction",
            "confidence",
            "fairness_status",
            "safety_status",
            "recommendations",
            "disclaimer",
        ]
        for key in required_keys:
            if key not in body:
                issues.append(f"Diabetes response missing key: {key}")
        if body.get("pipeline") != "diabetes":
            issues.append(f"Diabetes pipeline tag incorrect: {body.get('pipeline')}")

    audit_status = client.get("/api/v1/audit/status")
    if audit_status.status_code != 200:
        issues.append(f"Audit status endpoint failed: {audit_status.status_code}")
    else:
        ap = audit_status.json()
        for key in ["blockchain_enabled", "rpc_url", "contract_address"]:
            if key not in ap:
                issues.append(f"Audit status missing key: {key}")

    checkup_report = {
        "status": "ok" if not issues else "failed",
        "issues": issues,
    }

    output_dir = Path("models") / "backend"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "backend_checkup_report.json"
    output_path.write_text(json.dumps(checkup_report, indent=2), encoding="utf-8")

    print("=== Backend Checkup ===")
    print(f"Status: {checkup_report['status']}")
    if issues:
        for issue in issues:
            print(f"- {issue}")
    print(f"Report: {output_path}")

    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(run_checkup())
