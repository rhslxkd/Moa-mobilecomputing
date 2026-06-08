from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel
from app.schemas.drive import FolderResponse, FileResponse, FolderCreateBody
from app.routers.auth import bearer_token
import app.services.drive as drive_svc

router = APIRouter(prefix="/drive", tags=["drive"])


class MoveBody(BaseModel):
    target_folder_id: Optional[str] = None


# ── 폴더 ───────────────────────────────────────────────────

@router.get("/folders", response_model=list[FolderResponse])
def list_folders(
    project_id: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    token: str = Depends(bearer_token),
):
    return drive_svc.list_folders(project_id, parent_id, token)


@router.post("/folders", response_model=FolderResponse, status_code=201)
def create_folder(req: FolderCreateBody, token: str = Depends(bearer_token)):
    return drive_svc.create_folder(req.name, req.project_id, req.parent_id, token)


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: str, token: str = Depends(bearer_token)):
    drive_svc.delete_folder(folder_id, token)


@router.post("/folders/{folder_id}/move", response_model=FolderResponse)
def move_folder(folder_id: str, body: MoveBody, token: str = Depends(bearer_token)):
    return drive_svc.move_folder(folder_id, body.target_folder_id, token)


# ── 파일 ───────────────────────────────────────────────────

@router.get("/files", response_model=list[FileResponse])
def list_files(
    project_id: Optional[str] = Query(None),
    folder_id: Optional[str] = Query(None),
    token: str = Depends(bearer_token),
):
    return drive_svc.list_files(project_id, folder_id, token)


@router.post("/files", response_model=FileResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    token: str = Depends(bearer_token),
):
    data = await file.read()
    return drive_svc.upload_file(
        data, file.filename or "file", file.content_type, project_id, folder_id, token,
    )


@router.get("/files/{file_id}/download")
def download_file(file_id: str, token: str = Depends(bearer_token)):
    return {"url": drive_svc.get_download_url(file_id, token)}


@router.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: str, token: str = Depends(bearer_token)):
    drive_svc.delete_file(file_id, token)


@router.post("/files/{file_id}/move", response_model=FileResponse)
def move_file(file_id: str, body: MoveBody, token: str = Depends(bearer_token)):
    return drive_svc.move_file(file_id, body.target_folder_id, token)
