from fastapi import APIRouter, Depends
from app.schemas.report import ReportResponse
from app.routers.auth import bearer_token
import app.services.report as report_svc

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/my-scores")
def get_my_scores(token: str = Depends(bearer_token)) -> dict[str, int]:
    """프로젝트별 저장된 내 기여도 점수 (AI 없이 빠름). {project_id: score}"""
    return report_svc.get_my_scores(token)


@router.get("/{project_id}", response_model=ReportResponse)
def get_report(project_id: str, token: str = Depends(bearer_token)):
    return report_svc.get_report(project_id, token)
