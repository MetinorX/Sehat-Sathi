from typing import Dict, Any, List

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services import drift_monitor, feedback_store

router = APIRouter()


class FeedbackRequest(BaseModel):
    request_id: str
    useful: bool
    correction_note: str | None = None
    reviewer: str | None = None


@router.get("/drift")
async def get_drift_summary() -> Dict[str, Any]:
    return drift_monitor.summary()


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest) -> Dict[str, Any]:
    return feedback_store.add_feedback(
        request_id=request.request_id,
        useful=request.useful,
        correction_note=request.correction_note,
        reviewer=request.reviewer,
    )


@router.get("/feedback")
async def list_feedback() -> List[Dict[str, Any]]:
    return feedback_store.list_feedback()
