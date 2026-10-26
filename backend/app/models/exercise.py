"""Interactive exercise within a lesson."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database import Base


class Exercise(Base):
    """
    An interactive exercise (e.g. drag-and-drop, fill-in-the-blanks).

    question_data and correct_answer are JSON so different exercise types
    can store their own structure without schema changes.
    """

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Prefer JSONB on PostgreSQL; falls back to JSON on other dialects
    question_data: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)
    correct_answer: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)

    lesson: Mapped["Lesson"] = relationship(back_populates="exercises")
