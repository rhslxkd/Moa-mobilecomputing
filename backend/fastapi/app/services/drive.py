import re
import uuid as uuidlib

from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.drive import FolderResponse, FileResponse

BUCKET = "drive"


def _safe_ext(filename: str) -> str:
    """Storage 키용 안전한 확장자 추출 (한글/특수문자 제거)."""
    if "." in filename:
        ext = filename.rsplit(".", 1)[1]
        ext = re.sub(r"[^a-zA-Z0-9]", "", ext)
        if ext:
            return f".{ext.lower()}"
    return ""


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _has_project_access(project_id: str, user_id: str) -> bool:
    """프로젝트 owner이거나 수락된 멤버면 접근 가능."""
    if not project_id:
        return False
    if (
        supabase_admin.table("projects").select("id")
        .eq("id", project_id).eq("owner_id", user_id).limit(1).execute()
    ).data:
        return True
    if (
        supabase_admin.table("project_members").select("id")
        .eq("project_id", project_id).eq("user_id", user_id).eq("status", "accepted")
        .limit(1).execute()
    ).data:
        return True
    return False


def _folder_project_id(folder_id: str) -> str | None:
    rows = (
        supabase_admin.table("drive_folders").select("project_id")
        .eq("id", folder_id).limit(1).execute()
    ).data
    return rows[0].get("project_id") if rows else None


def _folder_item_count(folder_id: str) -> int:
    subfolders = (
        supabase_admin.table("drive_folders").select("id").eq("parent_id", folder_id).execute()
    ).data
    files = (
        supabase_admin.table("drive_files").select("id").eq("folder_id", folder_id).execute()
    ).data
    return len(subfolders) + len(files)


def _build_folder(row: dict) -> FolderResponse:
    return FolderResponse(
        id=row["id"],
        name=row["name"],
        item_count=_folder_item_count(row["id"]),
        project_id=row.get("project_id"),
        parent_id=row.get("parent_id"),
        created_at=row["created_at"],
    )


def _build_file(row: dict) -> FileResponse:
    return FileResponse(
        id=row["id"],
        name=row["name"],
        mime_type=row.get("mime_type"),
        size_bytes=row.get("size_bytes"),
        project_id=row.get("project_id"),
        folder_id=row.get("folder_id"),
        created_at=row["created_at"],
    )


# ── 폴더 ───────────────────────────────────────────────────

def list_folders(project_id: str | None, parent_id: str | None, token: str) -> list[FolderResponse]:
    user = _get_user(token)
    query = supabase_admin.table("drive_folders").select("*")
    if parent_id:
        # 부모 폴더가 프로젝트 소속이면 팀 멤버 전체 접근, 아니면 개인
        pj = _folder_project_id(parent_id)
        if pj:
            if not _has_project_access(pj, user.id):
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
            query = query.eq("parent_id", parent_id)
        else:
            query = query.eq("parent_id", parent_id).eq("owner_id", user.id)
    elif project_id:
        # 프로젝트 폴더 루트 → 멤버 전체 공유
        if not _has_project_access(project_id, user.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
        query = query.eq("project_id", project_id).is_("parent_id", "null")
    else:
        # 개인 루트
        query = query.is_("project_id", "null").is_("parent_id", "null").eq("owner_id", user.id)
    rows = query.order("created_at", desc=True).execute().data
    return [_build_folder(r) for r in rows]


def create_folder(name: str, project_id: str | None, parent_id: str | None, token: str) -> FolderResponse:
    user = _get_user(token)
    # 서브폴더면 부모의 project_id 상속 (프로젝트 폴더 하위는 계속 프로젝트 소속)
    if parent_id and not project_id:
        project_id = _folder_project_id(parent_id)
    row = (
        supabase_admin.table("drive_folders")
        .insert({
            "owner_id": user.id,
            "name": name,
            "project_id": project_id,
            "parent_id": parent_id,
        })
        .execute()
    ).data[0]
    return _build_folder(row)


def _collect_storage_paths(folder_id: str) -> list[str]:
    """폴더 하위(재귀)의 모든 파일 storage_path 수집."""
    paths: list[str] = []
    files = supabase_admin.table("drive_files").select("storage_path").eq("folder_id", folder_id).execute().data
    paths.extend(f["storage_path"] for f in files)
    subs = supabase_admin.table("drive_folders").select("id").eq("parent_id", folder_id).execute().data
    for s in subs:
        paths.extend(_collect_storage_paths(s["id"]))
    return paths


def delete_folder(folder_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("drive_folders")
        .select("id, owner_id, project_id").eq("id", folder_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="폴더를 찾을 수 없습니다.")
    f = rows[0]
    # owner거나 같은 프로젝트 멤버면 삭제 가능
    if f["owner_id"] != user.id:
        if not (f.get("project_id") and _has_project_access(f["project_id"], user.id)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
    # 하위 파일들 Storage에서 제거
    paths = _collect_storage_paths(folder_id)
    if paths:
        try:
            supabase_admin.storage.from_(BUCKET).remove(paths)
        except Exception:
            pass
    # DB는 CASCADE로 자동 삭제
    supabase_admin.table("drive_folders").delete().eq("id", folder_id).execute()


# ── 파일 ───────────────────────────────────────────────────

def list_files(project_id: str | None, folder_id: str | None, token: str) -> list[FileResponse]:
    user = _get_user(token)
    query = supabase_admin.table("drive_files").select("*")
    if folder_id:
        pj = _folder_project_id(folder_id)
        if pj:
            if not _has_project_access(pj, user.id):
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
            query = query.eq("folder_id", folder_id)
        else:
            query = query.eq("folder_id", folder_id).eq("owner_id", user.id)
    elif project_id:
        if not _has_project_access(project_id, user.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
        query = query.eq("project_id", project_id).is_("folder_id", "null")
    else:
        query = query.is_("project_id", "null").is_("folder_id", "null").eq("owner_id", user.id)
    rows = query.order("created_at", desc=True).execute().data
    return [_build_file(r) for r in rows]


def upload_file(
    file_bytes: bytes, filename: str, mime_type: str | None,
    project_id: str | None, folder_id: str | None, token: str,
) -> FileResponse:
    user = _get_user(token)
    # 폴더 안에 업로드하면 그 폴더의 project_id 상속 (팀 공유 유지)
    if folder_id and not project_id:
        project_id = _folder_project_id(folder_id)
    # Storage 키는 ASCII만 (원본 이름은 DB name 컬럼에 저장)
    storage_path = f"{user.id}/{uuidlib.uuid4().hex}{_safe_ext(filename)}"
    try:
        supabase_admin.storage.from_(BUCKET).upload(
            storage_path, file_bytes,
            {"content-type": mime_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"파일 업로드 실패: {str(e)[:120]}")

    row = (
        supabase_admin.table("drive_files")
        .insert({
            "owner_id": user.id,
            "name": filename,
            "storage_path": storage_path,
            "mime_type": mime_type,
            "size_bytes": len(file_bytes),
            "project_id": project_id,
            "folder_id": folder_id,
        })
        .execute()
    ).data[0]
    return _build_file(row)


def _get_accessible_file(file_id: str, user_id: str) -> dict:
    """owner거나 같은 프로젝트 멤버면 접근 가능한 파일 반환."""
    rows = (
        supabase_admin.table("drive_files")
        .select("storage_path, owner_id, project_id").eq("id", file_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="파일을 찾을 수 없습니다.")
    f = rows[0]
    if f["owner_id"] != user_id:
        if not (f.get("project_id") and _has_project_access(f["project_id"], user_id)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
    return f


def get_download_url(file_id: str, token: str) -> str:
    user = _get_user(token)
    f = _get_accessible_file(file_id, user.id)
    try:
        signed = supabase_admin.storage.from_(BUCKET).create_signed_url(f["storage_path"], 3600)
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"다운로드 링크 생성 실패: {str(e)[:120]}")
    return signed.get("signedURL") or signed.get("signed_url") or ""


def delete_file(file_id: str, token: str) -> None:
    user = _get_user(token)
    f = _get_accessible_file(file_id, user.id)
    try:
        supabase_admin.storage.from_(BUCKET).remove([f["storage_path"]])
    except Exception:
        pass
    supabase_admin.table("drive_files").delete().eq("id", file_id).execute()


# ── 이동 ───────────────────────────────────────────────────

def move_file(file_id: str, target_folder_id: str | None, token: str) -> FileResponse:
    """파일을 다른 폴더로 이동. target_folder_id가 None이면 해당 컨텍스트 루트로."""
    user = _get_user(token)
    _get_accessible_file(file_id, user.id)
    new_project_id = _folder_project_id(target_folder_id) if target_folder_id else None
    if target_folder_id and not _has_project_access(new_project_id or "", user.id):
        # 개인 폴더 대상이면 소유 확인
        owns = (
            supabase_admin.table("drive_folders").select("id")
            .eq("id", target_folder_id).eq("owner_id", user.id).limit(1).execute()
        ).data
        if not new_project_id and not owns:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="대상 폴더에 접근할 수 없습니다.")
    row = (
        supabase_admin.table("drive_files")
        .update({"folder_id": target_folder_id, "project_id": new_project_id})
        .eq("id", file_id).execute()
    ).data[0]
    return _build_file(row)


def move_folder(folder_id: str, target_folder_id: str | None, token: str) -> FolderResponse:
    """폴더를 다른 폴더 아래로 이동. 자기 자신/하위로는 이동 불가."""
    user = _get_user(token)
    rows = (
        supabase_admin.table("drive_folders").select("id, owner_id, project_id")
        .eq("id", folder_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="폴더를 찾을 수 없습니다.")
    f = rows[0]
    if f["owner_id"] != user.id and not (f.get("project_id") and _has_project_access(f["project_id"], user.id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
    if target_folder_id == folder_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="자기 자신으로 이동할 수 없습니다.")
    # 순환 방지: target이 folder의 하위인지 확인
    if target_folder_id:
        cur: str | None = target_folder_id
        while cur:
            if cur == folder_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="하위 폴더로 이동할 수 없습니다.")
            parent = (
                supabase_admin.table("drive_folders").select("parent_id")
                .eq("id", cur).limit(1).execute()
            ).data
            cur = parent[0].get("parent_id") if parent else None
    new_project_id = _folder_project_id(target_folder_id) if target_folder_id else None
    row = (
        supabase_admin.table("drive_folders")
        .update({"parent_id": target_folder_id, "project_id": new_project_id})
        .eq("id", folder_id).execute()
    ).data[0]
    return _build_folder(row)


# ── AI 자동 정리 ───────────────────────────────────────────

def auto_organize(project_id: str | None, folder_id: str | None, token: str) -> dict:
    """현재 위치의 파일들을 AI가 주제별로 묶어 폴더 생성 + 이동.

    같은 주제(버전/중복) 2개 이상만 폴더화, 단독 파일은 루트 유지.
    """
    from app.services import ai
    user = _get_user(token)
    # 현재 컨텍스트의 (하위폴더 없는) 파일 목록
    files = list_files(project_id, folder_id, token)
    targets = [{"id": f.id, "name": f.name} for f in files]
    if len(targets) < 2:
        return {"moved": 0, "folders": 0, "message": "정리할 파일이 충분하지 않아요."}

    try:
        mapping = ai.categorize_files(targets)  # {file_id: 주제(폴더명) or ""}
    except Exception:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="AI 분류에 실패했어요. 잠시 후 다시 시도해주세요.")

    # 주제별 묶기 (빈 주제는 제외)
    groups: dict[str, list[str]] = {}
    for fid, topic in mapping.items():
        if topic:
            groups.setdefault(topic, []).append(fid)

    moved = 0
    created = 0
    for topic, fids in groups.items():
        if len(fids) < 2:   # 2개 이상만 폴더화
            continue
        new_folder = create_folder(topic, project_id, folder_id, token)
        created += 1
        for fid in fids:
            try:
                move_file(fid, new_folder.id, token)
                moved += 1
            except Exception:
                pass

    if created == 0:
        return {"moved": 0, "folders": 0, "message": "묶을 만한 비슷한 파일이 없었어요."}
    return {"moved": moved, "folders": created, "message": f"{created}개 폴더로 {moved}개 파일을 정리했어요."}
