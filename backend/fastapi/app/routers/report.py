from fastapi import APIRouter, Depends
from app.schemas.report import ReportResponse
from app.routers.auth import bearer_token
import app.services.report as report_svc

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{project_id}", response_model=ReportResponse)
def get_report(project_id: str, token: str = Depends(bearer_token)):
    return report_svc.get_report(project_id, token)
