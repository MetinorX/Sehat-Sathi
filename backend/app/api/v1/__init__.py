from fastapi import APIRouter
from . import analyze, audit, fairness, ops, predict, reports

router = APIRouter()
router.include_router(predict.router, prefix="/predict", tags=["predict"])
router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
router.include_router(audit.router, prefix="/audit", tags=["audit"])
router.include_router(fairness.router, prefix="/fairness", tags=["fairness"])
router.include_router(ops.router, prefix="/ops", tags=["ops"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
