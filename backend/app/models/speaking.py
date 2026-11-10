"""Persisted AI speaking practice sessions and turns."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SpeakingSession(Base):
    """One speaking practice run for a learner on a lesson."""

    __tablename__ = "speaking_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    messages: Mapped[list["SpeakingMessage"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SpeakingMessage.id",
    )


class SpeakingMessage(Base):
    """One learner utterance plus the tutor reply for a speaking session."""

    __tablename__ = "speaking_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("speaking_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_transcript: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ai_reply_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    grammar_correction: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ai_audio_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped["SpeakingSession"] = relationship(back_populates="messages")
