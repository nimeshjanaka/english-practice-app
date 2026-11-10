"""Learner onboarding profile stored beside the auth account."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProfile(Base):
    """Name, level, goals, and preferred tutor voice for one user."""

    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    level: Mapped[str] = mapped_column(String(16), nullable=False, default="", server_default="")
    goals: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    preferred_voice: Mapped[str] = mapped_column(String(64), nullable=False, default="", server_default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="profile")
