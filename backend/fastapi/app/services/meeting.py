from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError
from openai import RateLimitError, APIError, OpenAIError

from app.core.supabase import supabase_admin
from app.schemas.meeting import MeetingCreate, MeetingResponse, ParticipantResponse
from app.services.transcribe import transcribe_audio, summarize_transcript


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _fetch_participants(meeting_id: str) -> list[dict]:
    return (
        supabase_admin.table("meeting_participants")
        .select("*")
        .eq("meeting_id", meeting_id)
        .execute()
    ).data


def _build(row: dict, participants: list[dict], project_name: str | None = None) -> MeetingResponse:
    return MeetingResponse(
        id=row["id"],
        title=row["title"],
        project_id=row.get("project_id"),
        project_name=project_name,
        duration_seconds=row.get("duration_seconds", 0),
        summary=row.get("summary") or [],
        transcript=row.get("transcript"),
        participants=[
            ParticipantResponse(
                id=p["id"],
                name=p["name"],
                speak_time_seconds=p.get("speak_time_seconds", 0),
                member_id=p.get("member_id"),
            )
            for p in participants
        ],
        created_at=row["created_at"],
    )


def _get_proj_name(project_id: str | None) -> str | None:
    if not project_id:
        return None
    rows = (
        supabase_admin.table("projects")
        .select("name")
        .eq("id", project_id)
        .limit(1)
        .execute()
    ).data
    return rows[0]["name"] if rows else None


def list_meetings(project_id: str | None, token: str) -> list[MeetingResponse]:
    user = _get_user(token)
    query = (
        supabase_admin.table("meetings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
    )
    if project_id:
        query = query.eq("project_id", project_id)
    rows = query.execute().data

    proj_ids = {r["project_id"] for r in rows if r.get("project_id")}
    proj_map: dict[str, str] = {}
    if proj_ids:
        projs = (
            supabase_admin.table("projects")
            .select("id, name")
            .in_("id", list(proj_ids))
            .execute()
        ).data
        proj_map = {p["id"]: p["name"] for p in projs}

    return [_build(r, _fetch_participants(r["id"]), proj_map.get(r.get("project_id", ""))) for r in rows]


def create_meeting(req: MeetingCreate, token: str) -> MeetingResponse:
    user = _get_user(token)
    payload: dict = {
        "owner_id": user.id,
        "title": req.title,
        "duration_seconds": req.duration_seconds,
        "summary": req.summary,
    }
    if req.project_id:
        payload["project_id"] = req.project_id

    row = (supabase_admin.table("meetings").insert(payload).execute()).data[0]

    parts: list[dict] = []
    if req.participants:
        parts = (
            supabase_admin.table("meeting_participants")
            .insert([
                {
                    "meeting_id": row["id"],
                    "name": p.name,
                    "speak_time_seconds": p.speak_time_seconds,
                    "member_id": p.member_id,
                }
                for p in req.participants
            ])
            .execute()
        ).data

    return _build(row, parts, _get_proj_name(row.get("project_id")))


def get_meeting(meeting_id: str, token: str) -> MeetingResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings")
        .select("*")
        .eq("id", meeting_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    row = rows[0]
    return _build(row, _fetch_participants(meeting_id), _get_proj_name(row.get("project_id")))


def delete_meeting(meeting_id: str, token: str) -> None:
    user = _get_user(token)
    if not (
        supabase_admin.table("meetings")
        .select("id")
        .eq("id", meeting_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    supabase_admin.table("meetings").delete().eq("id", meeting_id).execute()


def process_audio(meeting_id: str, audio_bytes: bytes, filename: str, token: str) -> MeetingResponse:
    """오디오 업로드 → Whisper 전사 → GPT 요약 → meetings 저장."""
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings")
        .select("id")
        .eq("id", meeting_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")

    try:
        transcript = transcribe_audio(audio_bytes, filename)
        summary = summarize_transcript(transcript)
    except RateLimitError:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail="OpenAI 사용량/결제 한도를 초과했습니다. OpenAI 계정의 크레딧을 확인해주세요.",
        )
    except (APIError, OpenAIError) as e:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"음성 인식 처리 중 오류가 발생했습니다: {str(e)[:100]}",
        )

    supabase_admin.table("meetings").update(
        {"transcript": transcript, "summary": summary}
    ).eq("id", meeting_id).execute()

    return get_meeting(meeting_id, token)
