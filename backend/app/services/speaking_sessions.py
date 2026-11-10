"""Create and load speaking practice sessions from the database."""

from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.speaking import SpeakingMessage, SpeakingSession


def create_speaking_session(db: Session, user_id: int, lesson_id: int) -> SpeakingSession:
    """Start a new speaking session for this learner and lesson."""
    session = SpeakingSession(id=uuid4().hex, user_id=user_id, lesson_id=lesson_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_speaking_session(db: Session, session_id: str) -> SpeakingSession | None:
    """Load a speaking session by id, or None if missing."""
    return db.get(SpeakingSession, session_id)


def save_speaking_message(
    db: Session,
    *,
    session_id: str,
    user_transcript: str,
    ai_reply_text: str,
    grammar_correction: str,
    ai_audio_url: str,
) -> SpeakingMessage:
    """Persist one learner + tutor turn for the session."""
    message = SpeakingMessage(
        session_id=session_id,
        user_transcript=user_transcript,
        ai_reply_text=ai_reply_text,
        grammar_correction=grammar_correction,
        ai_audio_url=ai_audio_url,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
