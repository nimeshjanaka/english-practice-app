"""Curriculum CMS models.

Hierarchy: CEFR level → Course → Unit (existing) → Lesson (existing)
→ Lesson section / Exercise (existing, extended).

Existing integer primary keys are kept so the mobile app does not break.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CefrLevel(Base):
    __tablename__ = "cefr_levels"

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    level_code: Mapped[str] = mapped_column(ForeignKey("cefr_levels.code"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    units: Mapped[list["Unit"]] = relationship(back_populates="course")


class LessonSection(Base):
    __tablename__ = "lesson_sections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")


class LearningObjective(Base):
    __tablename__ = "learning_objectives"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True, index=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), nullable=True, index=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class GrammarTopic(Base):
    __tablename__ = "grammar_topics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    level_code: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    explanation_si: Mapped[str] = mapped_column(Text, nullable=False, default="")
    examples: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True)
    level_code: Mapped[str] = mapped_column(String(8), nullable=False, default="A1")
    term: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    part_of_speech: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    definition: Mapped[str] = mapped_column(Text, nullable=False, default="")
    example: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")

    translations: Mapped[list["VocabularyTranslation"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("term", "level_code", name="uq_vocab_term_level"),)


class VocabularyTranslation(Base):
    __tablename__ = "vocabulary_translations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vocabulary_id: Mapped[int] = mapped_column(ForeignKey("vocabulary_items.id", ondelete="CASCADE"), index=True)
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    item: Mapped["VocabularyItem"] = relationship(back_populates="translations")


class ListeningItem(Base):
    __tablename__ = "listening_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False, default="")
    audio_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")


class SpeakingScenario(Base):
    __tablename__ = "speaking_scenarios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    situation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tutor_instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    level_code: Mapped[str] = mapped_column(String(8), nullable=False, default="A1")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    pass_mark: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", server_default="draft")


class ContentReview(Base):
    """Human decision on a content record. entity is courses|units|lessons|exercises|..."""

    __tablename__ = "content_reviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
