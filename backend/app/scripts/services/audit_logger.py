from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict


class AuditLogger:
    def create_record(self, payload: Dict[str, Any], consent_given: bool) -> Dict[str, str]:
        timestamp = datetime.now(timezone.utc).isoformat()
        canonical = {
            "timestamp": timestamp,
            "consent_given": bool(consent_given),
            "payload": payload,
        }
        serialized = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        return {
            "audit_hash": digest,
            "timestamp": timestamp,
        }


audit_logger = AuditLogger()
