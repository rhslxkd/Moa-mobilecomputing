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


def analyze_contribution(context: dict) -> dict:
    """프로젝트 기여도 컨텍스트 → 멤버별 AI 코멘트 + 종합 평가.

    context = {
      "project_name": str,
      "members": [{"name", "todos_done", "todos_total", "weighted_score", "speak_seconds"}],
      "keywords": [str], "summaries": [str],
    }
    반환: {"member_comments": {name: comment}, "overall_comment": str}
    """
    members = context.get("members") or []
    if not members:
        return {"member_comments": {}, "overall_comment": ""}

    sys = (
        "너는 팀 프로젝트의 기여도를 평가하는 분석가야. "
        "각 멤버의 완료한 할 일 수와 난이도 가중 점수, 회의 발언량(초), "
        "회의 키워드/요약을 보고 한국어로 평가해줘. "
        "반드시 아래 JSON 형식으로만 답해:\n"
        '{"member_comments": {"멤버이름": "한두 문장 코멘트"}, '
        '"overall_comment": "팀 전체에 대한 2~3문장 종합 평가(누가 잘하고 있는지 포함)"}\n'
        "코멘트는 구체적이고 건설적으로, 칭찬과 개선점을 균형있게."
    )
    user = json.dumps(context, ensure_ascii=False)
    raw = chat(
        [{"role": "system", "content": sys}, {"role": "user", "content": user}],
        temperature=0.4,
    )
    # JSON 파싱 (코드펜스 제거)
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text)
        return {
            "member_comments": data.get("member_comments") or {},
            "overall_comment": data.get("overall_comment") or "",
        }
    except (json.JSONDecodeError, ValueError):
        return {"member_comments": {}, "overall_comment": raw.strip()[:500]}
