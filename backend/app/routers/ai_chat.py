"""Voice chat: Groq Whisper STT → Llama tutor → PlayAI TTS → progress update."""

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
from app.schemas.ai_chat import ChatResponse
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


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    lesson_id: int = Form(...),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    Accept learner audio + lesson_id, run Groq STT → Llama → PlayAI TTS,
    return reply audio URL + grammar notes, and bump ai_talk_time_seconds.
    """
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    suffix = Path(audio.filename or "upload.m4a").suffix.lower() or ".m4a"
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{suffix}'. Allowed: {sorted(ALLOWED_AUDIO_SUFFIXES)}",
        )

    STATIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    tmp_path: Path | None = None
    try:
        # 1) Save uploaded audio temporarily
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

        # 2) Speech → text (Groq Whisper large-v3)
        transcript = transcribe_audio(client, tmp_path)
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not transcribe audio. Please try speaking again.",
            )

        # 3) Tutor reply + grammar JSON (Llama 3.3 70B)
        tutor = generate_tutor_reply(client, transcript, lesson_title=lesson.title)
        reply = tutor["reply"]
        grammar_correction = tutor["grammar_correction"]

        # 4) Text → speech (PlayAI TTS WAV)
        audio_filename = f"{uuid.uuid4().hex}.wav"
        output_path = STATIC_AUDIO_DIR / audio_filename
        synthesize_speech(client, reply, output_path)

        # 5) Public URL for the generated audio
        audio_url = str(request.base_url).rstrip("/") + f"/static/audio/{audio_filename}"

        # 6) Update (or create) user progress talk time for this lesson
        added_seconds = estimate_talk_seconds(transcript) + estimate_talk_seconds(reply)
        progress = db.scalar(
            select(UserProgress).where(
                UserProgress.user_id == current_user.id,
                UserProgress.lesson_id == lesson_id,
            )
        )
        if progress is None:
            progress = UserProgress(
                user_id=current_user.id,
                lesson_id=lesson_id,
                ai_talk_time_seconds=0,
            )
            db.add(progress)

        progress.ai_talk_time_seconds += added_seconds
        db.commit()
        db.refresh(progress)

        return ChatResponse(
            transcript=transcript,
            reply=reply,
            grammar_correction=grammar_correction,
            audio_url=audio_url,
            ai_talk_time_seconds=progress.ai_talk_time_seconds,
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
