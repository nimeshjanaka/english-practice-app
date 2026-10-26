"""Learning path unit (top-level curriculum group)."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Unit(Base):
    """A unit on the visual learning path (contains ordered lessons)."""

    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="unit",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )
