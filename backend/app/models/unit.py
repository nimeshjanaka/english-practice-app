"""Learning path unit (top-level curriculum group)."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Unit(Base):
    """A unit on the visual learning path (contains ordered lessons)."""

    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)
    level_code: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    outcome: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="published", server_default="published")

    course: Mapped["Course | None"] = relationship(back_populates="units")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="unit",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )
