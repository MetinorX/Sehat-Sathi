from typing import Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ReportExportRequest(BaseModel):
    request_id: str
    report: str
    metadata: Dict[str, Any] = {}


@router.post("/export/json")
async def export_report_json(request: ReportExportRequest) -> Dict[str, Any]:
    return {
        "format": "json",
        "request_id": request.request_id,
        "report": request.report,
        "metadata": request.metadata,
    }


@router.post("/export/markdown")
async def export_report_markdown(request: ReportExportRequest) -> Dict[str, Any]:
    md = "\n".join(
        [
            f"# Clinical Report ({request.request_id})",
            "",
            "## Report",
            request.report,
            "",
            "## Metadata",
            *[f"- **{k}**: {v}" for k, v in request.metadata.items()],
        ]
    )
    return {
        "format": "markdown",
        "request_id": request.request_id,
        "content": md,
    }
