"""Lesson within a unit."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Lesson(Base):
    """A single lesson belonging to a unit."""

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    icon_name: Mapped[str] = mapped_column(String(100), nullable=False, default="book")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    unit: Mapped["Unit"] = relationship(back_populates="lessons")
    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )
    progress: Mapped[list["UserProgress"]] = relationship(back_populates="lesson")
