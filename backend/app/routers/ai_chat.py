"""Voice chat: Groq Whisper STT → AI KIT tutor → Orpheus TTS → progress update."""

from __future__ import annotations

import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.lesson import Lesson
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.ai_chat import ChatResponse, SpeakResponse
from app.services.ai_chat import (
    estimate_talk_seconds,
    generate_tutor_reply,
    get_groq_client,
    synthesize_speech,
    transcribe_audio,
)

router = APIRouter()

# backend/static/audio — resolved from this file's location
STATIC_AUDIO_DIR = Path(__file__).resolve().parents[2] / "static" / "audio"
ALLOWED_AUDIO_SUFFIXES = {".m4a", ".mp3", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga", ".oga"}


def _require_lesson(db: Session, lesson_id: int) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


def _try_tts(request: Request, client: object, text: str) -> str:
    """Synthesize speech; return audio URL or empty string if TTS fails."""
    try:
        audio_filename = f"{uuid.uuid4().hex}.wav"
        output_path = STATIC_AUDIO_DIR / audio_filename
        synthesize_speech(client, text, output_path)
        return str(request.base_url).rstrip("/") + f"/static/audio/{audio_filename}"
    except Exception:
        # Common cause: Orpheus model terms not accepted in Groq console yet.
        return ""


def _bump_talk_time(
    db: Session,
    user: User,
    lesson_id: int,
    *texts: str,
) -> int:
    added = sum(estimate_talk_seconds(t) for t in texts if t)
    progress = db.scalar(
        select(UserProgress).where(
            UserProgress.user_id == user.id,
            UserProgress.lesson_id == lesson_id,
        )
    )
    if progress is None:
        progress = UserProgress(
            user_id=user.id,
            lesson_id=lesson_id,
            ai_talk_time_seconds=0,
        )
        db.add(progress)

    progress.ai_talk_time_seconds += max(1, added)
    db.commit()
    db.refresh(progress)
    return progress.ai_talk_time_seconds


@router.post("/speak", response_model=SpeakResponse)
async def speak(
    request: Request,
    lesson_id: int = Form(...),
    text: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeakResponse:
    """
    Speak an AI KIT line (intro / next question) without learner audio.
    Used after the user taps Start and between Q&A turns.
    """
    _require_lesson(db, lesson_id)
    spoken = (text or "").strip()
    if not spoken:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is required for AI KIT to speak.",
        )

    STATIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    try:
        client = get_groq_client()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    audio_url = _try_tts(request, client, spoken)
    _bump_talk_time(db, current_user, lesson_id, spoken)

    return SpeakResponse(text=spoken, audio_url=audio_url)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    lesson_id: int = Form(...),
    audio: UploadFile = File(...),
    current_question: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    Accept learner audio + lesson_id (+ optional current_question),
    run Groq STT → AI KIT correction → TTS, and bump ai_talk_time_seconds.
    """
    lesson = _require_lesson(db, lesson_id)

    suffix = Path(audio.filename or "upload.m4a").suffix.lower() or ".m4a"
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{suffix}'. Allowed: {sorted(ALLOWED_AUDIO_SUFFIXES)}",
        )

    STATIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            shutil.copyfileobj(audio.file, tmp)

        try:
            client = get_groq_client()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

        transcript = transcribe_audio(client, tmp_path)
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not transcribe audio. Please try speaking again.",
            )

        tutor = generate_tutor_reply(
            client,
            transcript,
            lesson_title=lesson.title,
            current_question=current_question.strip() or None,
        )
        reply = tutor["reply"]
        grammar_correction = tutor["grammar_correction"]

        audio_url = _try_tts(request, client, reply)
        total_seconds = _bump_talk_time(db, current_user, lesson_id, transcript, reply)

        return ChatResponse(
            transcript=transcript,
            reply=reply,
            grammar_correction=grammar_correction,
            audio_url=audio_url,
            ai_talk_time_seconds=total_seconds,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface Groq / IO failures cleanly
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI chat pipeline failed: {exc}",
        ) from exc
    finally:
        if tmp_path is not None and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        await audio.close()
