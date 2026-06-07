import re
import time
import uuid as uuidlib

import requests

from app.core.config import settings
from app.core.supabase import supabase_admin
from app.services.ai import summarize_transcript  # noqa: F401 (재export, 하위호환)

DAGLO_URL = "https://apis.daglo.ai/stt/v1/async/transcripts"
DRIVE_BUCKET = "drive"


def _safe_ext(filename: str) -> str:
    if "." in filename:
        ext = re.sub(r"[^a-zA-Z0-9]", "", filename.rsplit(".", 1)[1])
        if ext:
            return f".{ext.lower()}"
    return ".m4a"


def _t(obj: dict) -> float:
    """다글로 시간 객체 {seconds, nanos} → 초(float)."""
    if not obj:
        return 0.0
    return float(obj.get("seconds") or 0) + float(obj.get("nanos") or 0) / 1e9


def _parse_result(g: dict) -> dict:
    """다글로 응답 → {transcript, keywords, speaker_stats}."""
    results = g.get("sttResults") or []
    transcript = " ".join((r.get("transcript") or "").strip() for r in results).strip()

    keywords: list[str] = []
    speaker_stats: dict[str, float] = {}
    for r in results:
        for kw in (r.get("keywords") or []):
            if kw and kw not in keywords:
                keywords.append(kw)
        for w in (r.get("words") or []):
            sp = w.get("speaker")
            if sp is None:
                continue
            dur = max(0.0, _t(w.get("endTime")) - _t(w.get("startTime")))
            speaker_stats[str(sp)] = round(speaker_stats.get(str(sp), 0.0) + dur, 1)

    return {"transcript": transcript, "keywords": keywords, "speaker_stats": speaker_stats}


def transcribe_audio(audio_bytes: bytes, filename: str) -> dict:
    """다글로(Daglo) 비동기 STT로 오디오 → {transcript, keywords, speaker_stats}.

    화자분리 + 키워드추출 포함. 흐름: Storage 임시 업로드 → signed URL → POST(rid) → polling GET.
    """
    if not settings.daglo_api_key:
        raise RuntimeError("DAGLO_API_KEY가 설정되지 않았습니다.")

    headers = {"Authorization": f"Bearer {settings.daglo_api_key}"}

    # 1) Storage에 임시 업로드 후 signed URL 생성 (다글로가 URL로 다운로드)
    temp_path = f"stt-temp/{uuidlib.uuid4().hex}{_safe_ext(filename)}"
    supabase_admin.storage.from_(DRIVE_BUCKET).upload(
        temp_path, audio_bytes, {"content-type": "application/octet-stream"}
    )
    try:
        signed = supabase_admin.storage.from_(DRIVE_BUCKET).create_signed_url(temp_path, 3600)
        audio_url = signed.get("signedURL") or signed.get("signed_url")
        if not audio_url:
            raise RuntimeError("오디오 URL 생성 실패")

        # 2) 다글로 전사 요청 (화자분리 + 키워드추출) → rid
        post = requests.post(
            DAGLO_URL,
            headers={**headers, "Content-Type": "application/json"},
            json={
                "audio": {"source": {"url": audio_url}},
                "sttConfig": {"speakerDiarization": {"enable": True}},
                "nlpConfig": {"keywordExtraction": {"enable": True}},
            },
            timeout=30,
        )
        post.raise_for_status()
        rid = post.json().get("rid")
        if not rid:
            raise RuntimeError("다글로 rid를 받지 못했습니다.")

        # 3) polling (최대 약 4분)
        for _ in range(80):
            time.sleep(3)
            g = requests.get(f"{DAGLO_URL}/{rid}", headers=headers, timeout=30).json()
            status = g.get("status")
            if status == "transcribed":
                return _parse_result(g)
            if status in ("error", "failed", "transcribeError"):
                raise RuntimeError(f"다글로 전사 실패: {status}")
        raise RuntimeError("다글로 전사 시간 초과")
    finally:
        # 임시 파일 정리
        try:
            supabase_admin.storage.from_(DRIVE_BUCKET).remove([temp_path])
        except Exception:
            pass
