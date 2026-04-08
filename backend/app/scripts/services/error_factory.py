from typing import Dict, Any


def error_detail(code: str, message: str, extra: Dict[str, Any] | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if extra:
        payload.update(extra)
    return payload
