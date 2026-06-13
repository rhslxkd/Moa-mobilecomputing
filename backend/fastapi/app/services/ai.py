"""AI 호출 추상화 레이어.

OpenAI를 사용하지만, base_url + model만 바꾸면 Google AI Studio(Gemini) /
Groq 등 OpenAI 호환 API로 쉽게 전환할 수 있도록 한곳에 모았다.
전환 시 .env에 AI_BASE_URL / AI_MODEL 설정만 추가하면 된다.
"""
import json

from openai import OpenAI

from app.core.config import settings

# 호환 API 전환 지점: base_url 지정 시 그쪽으로 호출
_base_url = getattr(settings, "ai_base_url", "") or None
_model = getattr(settings, "ai_model", "") or "gpt-4o-mini"

client = OpenAI(api_key=settings.openai_api_key, base_url=_base_url)


def chat(messages: list[dict], temperature: float = 0.3) -> str:
    """기본 채팅 호출 → 응답 텍스트."""
    resp = client.chat.completions.create(
        model=_model,
        messages=messages,
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""


def summarize_transcript(transcript: str) -> list[str]:
    """녹취록을 핵심 포인트 리스트로 요약."""
    if len(transcript.strip()) < 8:
        return []
    content = chat(
        [
            {
                "role": "system",
                "content": (
                    "다음 회의 녹취록을 한국어로 3~5개의 핵심 포인트로 요약해줘. "
                    "각 포인트는 한 줄로, 불릿 기호 없이 간결하게 작성해. "
                    "결정사항과 담당자 배분, 액션 아이템 위주로 정리해."
                ),
            },
            {"role": "user", "content": transcript},
        ]
    )
    lines = [line.lstrip("-•*0123456789. ").strip() for line in content.split("\n") if line.strip()]
    return lines[:5]


def _parse_json(raw: str):
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


def extract_action_items(transcript: str) -> list[dict]:
    """회의 녹취록 → 할 일 목록 [{title, date}]. date는 YYYY-MM-DD 또는 null."""
    if len(transcript.strip()) < 8:
        return []
    from datetime import date
    today = date.today().isoformat()
    sys = (
        "다음 회의 녹취록에서 '해야 할 일(액션 아이템)'을 추출해줘. "
        f"오늘은 {today}야. '다음 주까지', '내일', '6월 12일' 같은 기한이 있으면 "
        "YYYY-MM-DD로 환산하고, 없으면 null로 둬. "
        "할 일이 없으면 빈 배열. 반드시 아래 JSON만 출력:\n"
        '{"items": [{"title": "간결한 할 일", "date": "YYYY-MM-DD 또는 null"}]}'
    )
    raw = chat([{"role": "system", "content": sys}, {"role": "user", "content": transcript}], temperature=0.2)
    data = _parse_json(raw) or {}
    items = data.get("items") or []
    out: list[dict] = []
    for it in items:
        title = (it.get("title") or "").strip()
        if not title:
            continue
        d = it.get("date")
        if isinstance(d, str):
            d = d.strip()
            if d.lower() in ("null", "none", ""):
                d = None
        else:
            d = None
        out.append({"title": title[:100], "date": d})
    return out[:10]


def categorize_files(files: list[dict]) -> dict:
    """파일 목록 → {file_id: 폴더명}. 주제/종류별로 묶는다.

    files = [{"id": str, "name": str}, ...]
    """
    if not files:
        return {}
    sys = (
        "어질러진 파일 드라이브를 정리해줘. 파일 이름을 보고 **같은 주제의 파일끼리 묶어라**. "
        "'발표자료1', '발표자료2', '발표자료_최종', '발표자료(진짜최종)'처럼 버전 번호·'최종'·날짜·복사본 표시는 "
        "**무시하고 핵심 주제(예: '발표자료')로 같은 그룹**으로 묶어. "
        "폴더명은 그 핵심 주제로 간결하게(한국어). 주제가 애매하거나 혼자뿐인 파일은 'folder'를 빈 문자열로 둬(폴더 안 만듦). "
        "반드시 아래 JSON만 출력:\n"
        '{"assignments": [{"id": "파일id", "folder": "핵심주제 또는 빈문자열"}]}'
    )
    user = json.dumps({"files": [{"id": f["id"], "name": f["name"]} for f in files]}, ensure_ascii=False)
    raw = chat([{"role": "system", "content": sys}, {"role": "user", "content": user}], temperature=0.2)
    data = _parse_json(raw) or {}
    out: dict = {}
    for a in (data.get("assignments") or []):
        fid, folder = a.get("id"), (a.get("folder") or "").strip()
        if fid and folder:
            out[fid] = folder[:20]
    return out


def match_speakers_to_members(speaker_samples: dict, member_names: list[str]) -> dict:
    """화자별 발언 샘플 + 멤버 이름 → {화자번호: 멤버이름 or None}.

    각자 발언 시 이름을 말한다는 전제(자기소개). 발언 내용에서 누구인지 추론.
    """
    if not speaker_samples or not member_names:
        return {}
    sys = (
        "회의 화자분리 결과를 실제 멤버와 매칭해줘. 각 화자는 발언 시작 부분에서 자기 이름을 "
        "밝히는 경우가 많아. 다음 한국어 자기소개 패턴을 적극적으로 찾아라:\n"
        "- '저는 OO입니다 / OO이에요 / OO예요'\n"
        "- 'OO인데요 / OO입니다만 / 제가 OO인데'\n"
        "- '안녕하세요 OO입니다', 'OO이라고 합니다'\n"
        f"멤버 목록: {member_names}\n"
        "매칭 규칙:\n"
        "1. 발언에서 언급된 이름과 멤버 목록을 비교해 가장 비슷한 멤버로 매칭해.\n"
        "2. 별명·줄임말·받침 변형·오타도 고려해 매칭해 (예: '현수'→'장현수우', '은상'→'송은상', '혜민이'→'김혜민').\n"
        "3. 이름이 일부만 일치해도(성 빼고 이름만, 이름 빼고 성만) 멤버 목록에 후보가 하나뿐이면 그 멤버로 매칭해.\n"
        "4. 발언에 이름 단서가 전혀 없거나 어느 멤버인지 정말 모르겠으면 그 화자만 null.\n"
        "확신이 서면 적극적으로 매칭하고, 추측이 가능하면 null보다 매칭을 우선해.\n"
        "반드시 아래 JSON만 출력:\n"
        '{"mapping": {"화자번호": "멤버이름 또는 null"}}'
    )
    user = json.dumps({"speakers": speaker_samples}, ensure_ascii=False)
    raw = chat([{"role": "system", "content": sys}, {"role": "user", "content": user}], temperature=0.1)
    data = _parse_json(raw) or {}
    mapping = data.get("mapping") or {}
    # 멤버 이름 검증 (목록에 없는 이름은 버림)
    valid = {}
    for sp, name in mapping.items():
        if name and name in member_names:
            valid[str(sp)] = name
    return valid


def analyze_contribution(context: dict) -> dict:
    """프로젝트 기여도(성실도+발언품질) 컨텍스트 → 멤버별 점수/코멘트 + 종합 평가.

    context = {
      "project_name": str,
      "members": [{"name", "todos_done", "todos_total",
                   "attendance": "정시"|"지각 N분"|"불참", "reason": str|null}],
      "summaries": [str], "transcript": str(요약/일부),
    }
    반환: {"member_scores": {name: int}, "member_comments": {name: comment}, "overall_comment": str}
    """
    members = context.get("members") or []
    if not members:
        return {"member_scores": {}, "member_comments": {}, "overall_comment": ""}

    sys = (
        "너는 팀 프로젝트의 기여도를 평가하는 공정한 분석가야. "
        "발언량(말을 많이 했는지)으로 평가하지 말고, **기여의 질과 성실도**로 평가해.\n"
        "원칙:\n"
        "1. 각 멤버의 'current_todos'(현재 맡은 할 일: 제목/난이도/완료여부)와 'roles'(역할)를 보고 "
        "**지금 책임지고 있는 일을 얼마나 해냈는지**로 평가해. **난이도 숫자에만 의존하지 말고 할 일 '제목의 실제 내용·비중'을 직접 판단**해라 "
        "(예: '발표 자료 전체 제작'은 '오타 수정'보다 비중이 큼). 핵심 작업을 끝낸 사람을 높게, 사소한 일만 한 사람은 낮게.\n"
        "2. 할 일의 담당은 수시로 바뀌거나 해제될 수 있어. 지금 그 멤버에게 배정된 할 일만 그 사람 몫이야. "
        "남에게 넘어간(=현재 배정 안 된) 일로 점수 주지 말고, 'unassigned_todos'(담당 없는 일)는 누구의 공으로도 치지 마.\n"
        "3. 회의에서의 **건설적 기여**는 높게, '회의하기 싫다'처럼 비협조적/부정적 발언은 감점.\n"
        "4. 출석 성실도 반영: 정시 > 지각 > 불참. 단 **정당한 사유(아파서, 일정 등)가 적힌 지각/불참은 감점하지 마라**. 사유 없는 불참/지각만 감점.\n"
        "5. 회의에 없었어도 맡은 할 일을 잘 했으면 점수를 받아야 함. 0점은 맡은 일도 안 하고 사유도 없을 때만.\n"
        "각 멤버 0~100 점수와 한두 문장 코멘트(맡은 일/역할/사유 언급)를 매겨. 반드시 아래 JSON만 출력:\n"
        '{"member_scores": {"이름": 0-100}, "member_comments": {"이름": "코멘트"}, '
        '"overall_comment": "팀 전체 2~3문장 종합 평가(누가 맡은 일을 성실히 해냈는지)"}'
    )
    user = json.dumps(context, ensure_ascii=False)
    raw = chat(
        [{"role": "system", "content": sys}, {"role": "user", "content": user}],
        temperature=0.4,
    )
    data = _parse_json(raw)
    if data:
        return {
            "member_scores": data.get("member_scores") or {},
            "member_comments": data.get("member_comments") or {},
            "overall_comment": data.get("overall_comment") or "",
        }
    return {"member_scores": {}, "member_comments": {}, "overall_comment": raw.strip()[:500]}
