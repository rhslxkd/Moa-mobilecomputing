from typing import Optional
from pydantic import BaseModel


class FolderResponse(BaseModel):
    id: str
    name: str
    item_count: int
    project_id: Optional[str]
    parent_id: Optional[str]
    created_at: str


class FileResponse(BaseModel):
    id: str
    name: str
    mime_type: Optional[str]
    size_bytes: Optional[int]
    project_id: Optional[str]
    folder_id: Optional[str]
    created_at: str


class FolderCreateBody(BaseModel):
    name: str
    project_id: Optional[str] = None
    parent_id: Optional[str] = None
