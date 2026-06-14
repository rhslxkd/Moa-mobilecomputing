import logging

from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError
from openai import RateLimitError, APIError, OpenAIError

from app.core.supabase import supabase_admin
from app.schemas.meeting import (
    MeetingCreate, MeetingResponse, ParticipantResponse,
    AttendanceResponse, AbsenteeResponse, ActionItem,
)
from app.services.transcribe import transcribe_audio, summarize_transcript
from app.services import ai

logger = logging.getLogger("moa.meeting")


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


def _display_name_for(user_id: str) -> str:
    rows = (
        supabase_admin.table("profiles")
        .select("first_name, last_name, username")
        .eq("id", user_id).limit(1).execute()
    ).data
    if rows:
        p = rows[0]
        full = f"{p.get('last_name') or ''}{p.get('first_name') or ''}".strip()
        return full or p.get("username") or "사용자"
    return "사용자"


def _attendance_rows(meeting_id: str) -> list[dict]:
    try:
        return (
            supabase_admin.table("meeting_attendance")
            .select("*").eq("meeting_id", meeting_id)
            .order("joined_at")
            .execute()
        ).data
    except Exception as e:
        # meeting_attendance 테이블이 아직 없으면(SQL 미적용) 빈 목록
        logger.warning("meeting_attendance 조회 실패(테이블 미적용?): %s", e)
        return []


def _build_attendance(meeting_id: str, project_id: str | None) -> tuple[list[AttendanceResponse], list[AbsenteeResponse]]:
    rows = _attendance_rows(meeting_id)
    attendees: list[AttendanceResponse] = []
    absentee_rows: list[AbsenteeResponse] = []
    present_user_ids: set[str] = set()
    for r in rows:
        present_user_ids.add(r.get("user_id"))
        if r.get("joined_at"):
            attendees.append(AttendanceResponse(
                user_id=r["user_id"], member_id=r.get("member_id"),
                name=r.get("name") or _display_name_for(r["user_id"]),
                joined_at=r.get("joined_at"), late_seconds=r.get("late_seconds") or 0,
                reason=r.get("reason"),
            ))
        else:
            # joined_at 없음 = 불참(사유만 기록된 행)
            absentee_rows.append(AbsenteeResponse(
                member_id=r.get("member_id"), user_id=r.get("user_id"),
                name=r.get("name") or _display_name_for(r["user_id"]),
                reason=r.get("reason"),
            ))
    # 아직 사유행조차 없는 미출석 프로젝트 멤버도 불참으로
    if project_id:
        members = (
            supabase_admin.table("project_members")
            .select("id, user_id, name").eq("project_id", project_id)
            .eq("status", "accepted").execute()
        ).data
        seen_members = {a.member_id for a in absentee_rows} | {a.member_id for a in attendees}
        for m in members:
            if m.get("user_id") and m["user_id"] in present_user_ids:
                continue
            if m["id"] in seen_members:
                continue
            absentee_rows.append(AbsenteeResponse(
                member_id=m["id"], user_id=m.get("user_id"),
                name=m.get("name") or "멤버", reason=None,
            ))
    return attendees, absentee_rows


def _build(row: dict, participants: list[dict], project_name: str | None = None) -> MeetingResponse:
    attendees, absentees = _build_attendance(row["id"], row.get("project_id"))
    return MeetingResponse(
        id=row["id"],
        title=row["title"],
        project_id=row.get("project_id"),
        project_name=project_name,
        duration_seconds=row.get("duration_seconds", 0),
        summary=row.get("summary") or [],
        transcript=row.get("transcript"),
        keywords=row.get("keywords") or [],
        speaker_stats=row.get("speaker_stats") or {},
        speaker_samples=row.get("speaker_samples") or {},
        participants=[
            ParticipantResponse(
                id=p["id"],
                name=p["name"],
                speak_time_seconds=p.get("speak_time_seconds", 0),
                member_id=p.get("member_id"),
                speaker_label=p.get("speaker_label"),
            )
            for p in participants
        ],
        started_at=row.get("started_at"),
        attendance=attendees,
        absentees=absentees,
        action_items=[ActionItem(**a) for a in (row.get("action_items") or [])],
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


def _has_project_access(project_id: str, user_id: str) -> bool:
    """owner이거나 수락된 멤버면 프로젝트 회의 접근 가능."""
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


def list_meetings(project_id: str | None, token: str) -> list[MeetingResponse]:
    user = _get_user(token)
    if project_id:
        # 프로젝트 회의: 멤버/방장이면 전체 회의 공유
        if not _has_project_access(project_id, user.id):
            return []
        rows = (
            supabase_admin.table("meetings")
            .select("*").eq("project_id", project_id)
            .order("created_at", desc=True).execute()
        ).data
    else:
        # 개인 회의: 내가 만든 것만
        rows = (
            supabase_admin.table("meetings")
            .select("*").eq("owner_id", user.id).is_("project_id", "null")
            .order("created_at", desc=True).execute()
        ).data

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
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    row = rows[0]
    # 소유자거나 같은 프로젝트 멤버면 열람 가능
    if row.get("owner_id") != user.id:
        if not _has_project_access(row.get("project_id"), user.id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
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
        stt = transcribe_audio(audio_bytes, filename)
        transcript = stt["transcript"]
        keywords = stt.get("keywords") or []
        speaker_stats = stt.get("speaker_stats") or {}
        speaker_samples = stt.get("speaker_samples") or {}
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

    # 회의에서 나온 할 일 추출 (실패해도 무시)
    action_items: list[dict] = []
    try:
        for it in ai.extract_action_items(transcript):
            action_items.append({"title": it.get("title", ""), "date": it.get("date"), "added": False})
    except Exception as e:
        logger.warning("액션아이템 추출 실패: %s", e)
        action_items = []

    try:
        supabase_admin.table("meetings").update(
            {"transcript": transcript, "summary": summary,
             "keywords": keywords, "speaker_stats": speaker_stats,
             "speaker_samples": speaker_samples, "action_items": action_items}
        ).eq("id", meeting_id).execute()
    except Exception:
        # 새 컬럼이 아직 없으면(SQL 미적용) 기본 필드만 저장
        supabase_admin.table("meetings").update(
            {"transcript": transcript, "summary": summary}
        ).eq("id", meeting_id).execute()

    # 화자 자동 매칭 (각자 발언 시 이름을 말한다는 전제) → 참여자 자동 생성
    _auto_map_speakers(meeting_id, speaker_stats, speaker_samples, transcript)

    return get_meeting(meeting_id, token)


def _auto_map_speakers(meeting_id: str, speaker_stats: dict, speaker_samples: dict, transcript: str = "") -> None:
    """발언 내용에서 멤버 이름을 찾아 화자→멤버 자동 매칭, 참여자 자동 생성."""
    if not speaker_samples:
        return
    mrow = (
        supabase_admin.table("meetings").select("project_id").eq("id", meeting_id).limit(1).execute()
    ).data
    project_id = mrow[0].get("project_id") if mrow else None
    if not project_id:
        return
    members = (
        supabase_admin.table("project_members")
        .select("id, name").eq("project_id", project_id).execute()
    ).data
    if not members:
        return
    name_to_id = {m["name"]: m["id"] for m in members if m.get("name")}
    try:
        matched = ai.match_speakers_to_members(speaker_samples, list(name_to_id.keys()), transcript)
    except Exception as e:
        logger.warning("화자-멤버 자동 매칭 실패: %s", e)
        return
    if not matched:
        return
    # 멤버 기준 집계 (여러 화자 → 한 멤버)
    agg: dict[str, dict] = {}
    for sp, name in matched.items():
        mid = name_to_id.get(name)
        if not mid:
            continue
        sec = float(speaker_stats.get(str(sp), 0))
        agg.setdefault(mid, {"sec": 0.0, "speakers": [], "name": name})
        agg[mid]["sec"] += sec
        agg[mid]["speakers"].append(str(sp))
    if not agg:
        return
    supabase_admin.table("meeting_participants").delete().eq("meeting_id", meeting_id).execute()
    supabase_admin.table("meeting_participants").insert([
        {
            "meeting_id": meeting_id,
            "name": data["name"],
            "speak_time_seconds": int(round(data["sec"])),
            "member_id": mid,
            "speaker_label": ",".join(data["speakers"]),
        }
        for mid, data in agg.items()
    ]).execute()


def set_speaker_mapping(meeting_id: str, mappings: list, token: str) -> MeetingResponse:
    """화자번호→멤버 수동 매칭. meeting_participants를 재생성하고
    speaker_stats의 화자별 발언시간을 speak_time_seconds로 채운다."""
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
    speaker_stats: dict = row.get("speaker_stats") or {}

    # 멤버 이름 조회
    member_ids = [m.member_id for m in mappings if m.member_id]
    name_map: dict[str, str] = {}
    if member_ids:
        members = (
            supabase_admin.table("project_members")
            .select("id, name")
            .in_("id", member_ids)
            .execute()
        ).data
        name_map = {m["id"]: m.get("name") or "멤버" for m in members}

    # 멤버 기준으로 집계 (여러 화자 → 한 멤버: 발언시간 합산, 화자번호 모음)
    # member_id가 없는(=없음) 매핑은 무시
    agg: dict[str, dict] = {}
    for m in mappings:
        if not m.member_id:
            continue
        sec = float(speaker_stats.get(str(m.speaker), 0))
        if m.member_id not in agg:
            agg[m.member_id] = {"sec": 0.0, "speakers": []}
        agg[m.member_id]["sec"] += sec
        agg[m.member_id]["speakers"].append(str(m.speaker))

    # 기존 참여자 제거 후 멤버별로 1명씩 재생성
    supabase_admin.table("meeting_participants").delete().eq("meeting_id", meeting_id).execute()
    new_parts = [
        {
            "meeting_id": meeting_id,
            "name": name_map.get(mid, "멤버"),
            "speak_time_seconds": int(round(data["sec"])),
            "member_id": mid,
            "speaker_label": ",".join(data["speakers"]),
        }
        for mid, data in agg.items()
    ]
    if new_parts:
        supabase_admin.table("meeting_participants").insert(new_parts).execute()

    return get_meeting(meeting_id, token)


# ── QR 출석 / 시작 / 종료 ───────────────────────────────────

def _member_for_user(project_id: str | None, user_id: str) -> dict | None:
    if not project_id:
        return None
    rows = (
        supabase_admin.table("project_members")
        .select("id, name").eq("project_id", project_id).eq("user_id", user_id)
        .limit(1).execute()
    ).data
    return rows[0] if rows else None


def start_meeting(title: str | None, project_id: str | None, token: str) -> MeetingResponse:
    """녹음 시작 시점에 회의 row 생성 + 시작자(owner) 자동 출석."""
    from datetime import datetime, timezone
    user = _get_user(token)
    now = datetime.now(timezone.utc).isoformat()
    payload: dict = {
        "owner_id": user.id,
        "title": title or (datetime.now().strftime("%Y년 %m월 %d일") + " 회의"),
        "duration_seconds": 0,
        "summary": [],
        "started_at": now,
    }
    if project_id:
        payload["project_id"] = project_id
    row = (supabase_admin.table("meetings").insert(payload).execute()).data[0]

    # 시작자 자동 출석
    owner_member = _member_for_user(project_id, user.id)
    try:
        supabase_admin.table("meeting_attendance").insert({
            "meeting_id": row["id"],
            "user_id": user.id,
            "member_id": owner_member["id"] if owner_member else None,
            "name": owner_member["name"] if owner_member else _display_name_for(user.id),
            "joined_at": now,
            "late_seconds": 0,
        }).execute()
    except Exception:
        pass

    return _build(row, _fetch_participants(row["id"]), _get_proj_name(row.get("project_id")))


def attend_meeting(meeting_id: str, token: str) -> dict:
    """QR 스캔 → 출석 기록. 지각 시간(시작 이후 경과초) 계산."""
    from datetime import datetime, timezone
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings").select("id, project_id, started_at")
        .eq("id", meeting_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    meeting = rows[0]
    now = datetime.now(timezone.utc)
    late = 0
    if meeting.get("started_at"):
        try:
            started = datetime.fromisoformat(meeting["started_at"].replace("Z", "+00:00"))
            late = max(0, int((now - started).total_seconds()))
        except Exception:
            late = 0
    member = _member_for_user(meeting.get("project_id"), user.id)

    existing = (
        supabase_admin.table("meeting_attendance").select("id, joined_at")
        .eq("meeting_id", meeting_id).eq("user_id", user.id).limit(1).execute()
    ).data
    data = {
        "meeting_id": meeting_id,
        "user_id": user.id,
        "member_id": member["id"] if member else None,
        "name": member["name"] if member else _display_name_for(user.id),
        "joined_at": now.isoformat(),
        "late_seconds": late,
    }
    if existing:
        # 이미 출석했으면 갱신 안 함(최초 스캔 시각 유지)
        if existing[0].get("joined_at"):
            return {"ok": True, "late_seconds": existing[0].get("late_seconds", 0)}
        supabase_admin.table("meeting_attendance").update(data).eq("id", existing[0]["id"]).execute()
    else:
        try:
            supabase_admin.table("meeting_attendance").insert(data).execute()
        except Exception as e:
            # 동시 스캔으로 인한 중복 insert(23505)는 이미 출석으로 간주
            if "23505" in str(e) or "duplicate key" in str(e):
                return {"ok": True, "late_seconds": late}
            raise
    return {"ok": True, "late_seconds": late}


def get_attendance(meeting_id: str, token: str):
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings").select("id, project_id, owner_id")
        .eq("id", meeting_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    attendees, absentees = _build_attendance(meeting_id, rows[0].get("project_id"))
    return {"attendees": attendees, "absentees": absentees}


def finalize_meeting(meeting_id: str, duration_seconds: int, reasons: list, token: str) -> MeetingResponse:
    """녹음 종료 후 사유 저장 + duration 업데이트 + 출석자 기준 참여자 생성."""
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings").select("*")
        .eq("id", meeting_id).eq("owner_id", user.id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    meeting = rows[0]

    supabase_admin.table("meetings").update(
        {"duration_seconds": duration_seconds}
    ).eq("id", meeting_id).execute()

    # 사유 저장: user_id면 해당 출석행 update, member_id(불참)면 사유행 upsert
    for r in reasons:
        reason = (r.reason or "").strip()
        if not reason:
            continue
        if r.user_id:
            existing = (
                supabase_admin.table("meeting_attendance").select("id")
                .eq("meeting_id", meeting_id).eq("user_id", r.user_id).limit(1).execute()
            ).data
            if existing:
                supabase_admin.table("meeting_attendance").update(
                    {"reason": reason}
                ).eq("id", existing[0]["id"]).execute()
            else:
                supabase_admin.table("meeting_attendance").insert({
                    "meeting_id": meeting_id, "user_id": r.user_id,
                    "member_id": r.member_id, "joined_at": None, "reason": reason,
                }).execute()
        elif r.member_id:
            # 불참 멤버(계정 연결됐을 수도) → member의 user_id로 사유행
            m = (
                supabase_admin.table("project_members").select("user_id, name")
                .eq("id", r.member_id).limit(1).execute()
            ).data
            uid = m[0].get("user_id") if m else None
            if uid:
                existing = (
                    supabase_admin.table("meeting_attendance").select("id, joined_at")
                    .eq("meeting_id", meeting_id).eq("user_id", uid).limit(1).execute()
                ).data
                if existing:
                    supabase_admin.table("meeting_attendance").update(
                        {"reason": reason}
                    ).eq("id", existing[0]["id"]).execute()
                else:
                    supabase_admin.table("meeting_attendance").insert({
                        "meeting_id": meeting_id, "user_id": uid,
                        "member_id": r.member_id,
                        "name": m[0].get("name") if m else None,
                        "joined_at": None, "reason": reason,
                    }).execute()

    # 출석자 기준으로 meeting_participants 생성 (없을 때만 — 화자매칭 전 기본 참여자)
    existing_parts = _fetch_participants(meeting_id)
    if not existing_parts:
        att_rows = [r for r in _attendance_rows(meeting_id) if r.get("joined_at")]
        if att_rows:
            supabase_admin.table("meeting_participants").insert([
                {
                    "meeting_id": meeting_id,
                    "name": r.get("name") or "멤버",
                    "speak_time_seconds": 0,
                    "member_id": r.get("member_id"),
                }
                for r in att_rows
            ]).execute()

    return get_meeting(meeting_id, token)


def add_action_item_todo(
    meeting_id: str, index: int, token: str,
    title: str | None = None, assignee_member_id: str | None = None,
) -> MeetingResponse:
    """회의 action_items[index]를 Todo로 추가 (제목/담당자 지정 가능)."""
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings").select("*")
        .eq("id", meeting_id).eq("owner_id", user.id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    meeting = rows[0]
    items = meeting.get("action_items") or []
    if index < 0 or index >= len(items):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="잘못된 항목입니다.")
    item = items[index]
    if item.get("added"):
        return get_meeting(meeting_id, token)

    final_title = (title or item.get("title") or "회의 할 일").strip()[:100] or "회의 할 일"
    todo_payload: dict = {
        "owner_id": user.id,
        "title": final_title,
        "done": False,
        "difficulty": 2,
    }
    if meeting.get("project_id"):
        todo_payload["project_id"] = meeting["project_id"]
    if assignee_member_id:
        todo_payload["assignee_member_id"] = assignee_member_id
    if item.get("date"):
        todo_payload["due_date"] = item["date"]
    supabase_admin.table("todos").insert(todo_payload).execute()

    items[index]["added"] = True
    items[index]["title"] = final_title
    supabase_admin.table("meetings").update({"action_items": items}).eq("id", meeting_id).execute()
    return get_meeting(meeting_id, token)
