from datetime import datetime, timezone
from typing import Dict, Any, List


class FeedbackStore:
    def __init__(self):
        self._items: List[Dict[str, Any]] = []

    def add_feedback(
        self,
        request_id: str,
        useful: bool,
        correction_note: str | None = None,
        reviewer: str | None = None,
    ) -> Dict[str, Any]:
        item = {
            "request_id": request_id,
            "useful": bool(useful),
            "correction_note": correction_note or "",
            "reviewer": reviewer or "anonymous",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._items.append(item)
        return item

    def list_feedback(self) -> List[Dict[str, Any]]:
        return list(self._items)


feedback_store = FeedbackStore()
