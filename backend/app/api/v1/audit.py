from typing import Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services import blockchain_audit_service

router = APIRouter()


class VerifyAuditRequest(BaseModel):
    request_id: str
    expected_hash: str


@router.get("/status")
async def audit_status() -> Dict[str, Any]:
    return {
        "blockchain_enabled": blockchain_audit_service.enabled,
        "rpc_url": blockchain_audit_service.rpc_url,
        "contract_address": blockchain_audit_service.contract_address or None,
    }


@router.get("/{request_id}")
async def get_audit_record(request_id: str) -> Dict[str, Any]:
    return blockchain_audit_service.fetch_audit(request_id)


@router.post("/verify")
async def verify_audit(request: VerifyAuditRequest) -> Dict[str, Any]:
    return blockchain_audit_service.verify_audit(
        request_id=request.request_id,
        expected_hash=request.expected_hash,
    )
