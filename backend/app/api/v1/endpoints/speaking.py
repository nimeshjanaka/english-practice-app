"""Speaking sessions: Groq STT → Llama reply/corrections → optional TTS."""

from __future__ import annotations

import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from groq import APIError as GroqAPIError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.speaking import (
    SpeakingMessageOut,
    SpeakingSessionCreate,
    SpeakingSessionEnd,
    SpeakingSessionEndOut,
    SpeakingSessionOut,
)
from app.services.ai_chat import (
    generate_tutor_reply,
    get_groq_client,
    synthesize_speech,
    transcribe_audio,
)
from app.services.progress import end_learning_session
from app.services.speaking_sessions import (
    create_speaking_session,
    get_speaking_session,
    save_speaking_message,
)

router = APIRouter()

STATIC_AUDIO_DIR = Path(__file__).resolve().parents[4] / "static" / "audio"
ALLOWED_AUDIO_SUFFIXES = {".m4a", ".mp3", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga", ".oga"}


def _audio_url(request: Request, client: object, text: str) -> str:
    """Synthesize tutor speech when TTS is available; otherwise return empty."""
    try:
        filename = f"{uuid.uuid4().hex}.wav"
        output_path = STATIC_AUDIO_DIR / filename
        synthesize_speech(client, text, output_path)
        return str(request.base_url).rstrip("/") + f"/static/audio/{filename}"
    except Exception:
        return ""


@router.post("/sessions", response_model=SpeakingSessionOut, status_code=status.HTTP_201_CREATED)
def open_session(
    payload: SpeakingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeakingSessionOut:
    """Start a speaking session and return its session_id."""
    if db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    session = create_speaking_session(db, current_user.id, payload.lesson_id)
    return SpeakingSessionOut(session_id=session.id, lesson_id=session.lesson_id)


@router.post("/sessions/{session_id}/messages", response_model=SpeakingMessageOut)
async def send_message(
    session_id: str,
    request: Request,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeakingMessageOut:
    """
    Accept learner audio, transcribe with Groq Whisper, reply with Llama-3.3-70b
    (including grammar tips), optionally synthesize TTS, and persist the turn.
    """
    session = get_speaking_session(db, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking session not found")

    lesson = db.get(Lesson, session.lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    suffix = Path(audio.filename or "upload.m4a").suffix.lower() or ".m4a"
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{suffix}'.",
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
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

        try:
            transcript = transcribe_audio(client, tmp_path)
            if not transcript:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not transcribe audio. Please try speaking again.",
                )

            tutor = generate_tutor_reply(client, transcript, lesson_title=lesson.title)
        except HTTPException:
            raise
        except GroqAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Speaking AI is unavailable right now: {exc}",
            ) from exc

        reply = tutor["reply"]
        grammar = tutor["grammar_correction"]
        audio_url = _audio_url(request, client, reply)

        save_speaking_message(
            db,
            session_id=session.id,
            user_transcript=transcript,
            ai_reply_text=reply,
            grammar_correction=grammar,
            ai_audio_url=audio_url,
        )

        return SpeakingMessageOut(
            user_transcript=transcript,
            ai_reply_text=reply,
            grammar_correction=grammar,
            ai_audio_url=audio_url,
        )
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)


@router.post("/sessions/{session_id}/end", response_model=SpeakingSessionEndOut)
def end_session(
    session_id: str,
    payload: SpeakingSessionEnd | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeakingSessionEndOut:
    """Close a speaking session and store total time in learning_sessions."""
    session = get_speaking_session(db, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking session not found")

    body = payload or SpeakingSessionEnd()
    row = end_learning_session(
        db,
        user_id=current_user.id,
        session_type="speaking",
        duration_seconds=body.duration_seconds,
        lesson_id=session.lesson_id,
        speaking_session_id=session.id,
        started_at=session.created_at,
    )
    return SpeakingSessionEndOut(session_id=session.id, duration_seconds=row.duration_seconds)
