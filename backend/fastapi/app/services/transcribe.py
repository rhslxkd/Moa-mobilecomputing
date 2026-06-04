import io
from openai import OpenAI

from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """OpenAI Whisper로 오디오 → 텍스트 전사."""
    file_obj = io.BytesIO(audio_bytes)
    # OpenAI는 확장자로 포맷을 판별하므로 name 속성 필요
    file_obj.name = filename
    resp = client.audio.transcriptions.create(
        model="whisper-1",
        file=file_obj,
    )
    return resp.text or ""


def summarize_transcript(transcript: str) -> list[str]:
    """녹취록을 핵심 포인트 리스트로 요약."""
    # 거의 빈 경우만 스킵 (GPT 환각 방지)
    if len(transcript.strip()) < 8:
        return []
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "다음 회의 녹취록을 한국어로 3~5개의 핵심 포인트로 요약해줘. "
                    "각 포인트는 한 줄로, 불릿 기호 없이 간결하게 작성해. "
                    "결정사항과 담당자 배분, 액션 아이템 위주로 정리해."
                ),
            },
            {"role": "user", "content": transcript},
        ],
        temperature=0.3,
    )
    content = resp.choices[0].message.content or ""
    lines = [line.lstrip("-•*0123456789. ").strip() for line in content.split("\n") if line.strip()]
    return lines[:5]
