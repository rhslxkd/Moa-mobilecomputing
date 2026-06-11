from fastapi import APIRouter, Depends
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.routers.auth import bearer_token
import app.services.project as project_svc

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(token: str = Depends(bearer_token)):
    return project_svc.list_projects(token)


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(req: ProjectCreate, token: str = Depends(bearer_token)):
    return project_svc.create_project(req, token)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, token: str = Depends(bearer_token)):
    return project_svc.get_project(project_id, token)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, req: ProjectUpdate, token: str = Depends(bearer_token)):
    return project_svc.update_project(project_id, req, token)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, token: str = Depends(bearer_token)):
    project_svc.delete_project(project_id, token)
