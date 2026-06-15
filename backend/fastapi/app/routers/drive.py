from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.schemas.drive import FolderResponse, FileResponse, FolderCreateBody
from app.routers.auth import bearer_token
import app.services.drive as drive_svc

router = APIRouter(prefix="/drive", tags=["drive"])


def _decode_filename(raw: str | None) -> str:
    """React Native FormData가 한글 파일명을 percent-encoding해 보내는 경우 복원."""
    name = raw or "file"
    if "%" in name:
        try:
            from urllib.parse import unquote
            decoded = unquote(name)
            if decoded and decoded != name:
                return decoded
        except Exception:
            pass
    return name


class MoveBody(BaseModel):
    target_folder_id: Optional[str] = None


class AutoOrganizeBody(BaseModel):
    project_id: Optional[str] = None
    folder_id: Optional[str] = None


class RenameBody(BaseModel):
    name: str


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
    return await run_in_threadpool(
        drive_svc.upload_file,
        data, _decode_filename(file.filename), file.content_type, project_id, folder_id, token,
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


@router.post("/auto-organize")
def auto_organize(body: AutoOrganizeBody, token: str = Depends(bearer_token)):
    return drive_svc.auto_organize(body.project_id, body.folder_id, token)


@router.post("/files/{file_id}/rename", response_model=FileResponse)
def rename_file(file_id: str, body: RenameBody, token: str = Depends(bearer_token)):
    return drive_svc.rename_file(file_id, body.name, token)


@router.post("/folders/{folder_id}/rename", response_model=FolderResponse)
def rename_folder(folder_id: str, body: RenameBody, token: str = Depends(bearer_token)):
    return drive_svc.rename_folder(folder_id, body.name, token)
