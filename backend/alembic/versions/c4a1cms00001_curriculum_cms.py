"""curriculum cms tables and content workflow columns

Revision ID: c4a1cms00001
Revises: 9374ef916946
Create Date: 2026-11-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4a1cms00001"
down_revision: Union[str, Sequence[str], None] = "9374ef916946"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cefr_levels",
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("level_code", sa.String(length=8), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["level_code"], ["cefr_levels.code"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_courses_level_code", "courses", ["level_code"])

    op.add_column("units", sa.Column("course_id", sa.Integer(), nullable=True))
    op.add_column("units", sa.Column("level_code", sa.String(length=8), nullable=True))
    op.add_column("units", sa.Column("description", sa.Text(), nullable=False, server_default=""))
    op.add_column("units", sa.Column("outcome", sa.Text(), nullable=False, server_default=""))
    op.add_column("units", sa.Column("status", sa.String(length=32), nullable=False, server_default="published"))
    op.create_foreign_key("fk_units_course_id", "units", "courses", ["course_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_units_course_id", "units", ["course_id"])
    op.create_index("ix_units_level_code", "units", ["level_code"])

    op.add_column("lessons", sa.Column("summary", sa.Text(), nullable=False, server_default=""))
    op.add_column("lessons", sa.Column("status", sa.String(length=32), nullable=False, server_default="published"))

    op.add_column("exercises", sa.Column("prompt", sa.Text(), nullable=False, server_default=""))
    op.add_column("exercises", sa.Column("explanation", sa.Text(), nullable=False, server_default=""))
    op.add_column("exercises", sa.Column("feedback", sa.Text(), nullable=False, server_default=""))
    op.add_column("exercises", sa.Column("difficulty", sa.String(length=16), nullable=False, server_default="A1"))
    op.add_column("exercises", sa.Column("marks", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("exercises", sa.Column("learning_objective", sa.Text(), nullable=False, server_default=""))
    op.add_column("exercises", sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("exercises", sa.Column("status", sa.String(length=32), nullable=False, server_default="published"))

    op.create_table(
        "lesson_sections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lesson_sections_lesson_id", "lesson_sections", ["lesson_id"])

    op.create_table(
        "learning_objectives",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "grammar_topics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("level_code", sa.String(length=8), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False, server_default=""),
        sa.Column("explanation_si", sa.Text(), nullable=False, server_default=""),
        sa.Column("examples", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "vocabulary_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("level_code", sa.String(length=8), nullable=False, server_default="A1"),
        sa.Column("term", sa.String(length=255), nullable=False),
        sa.Column("part_of_speech", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("definition", sa.Text(), nullable=False, server_default=""),
        sa.Column("example", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("term", "level_code", name="uq_vocab_term_level"),
    )

    op.create_table(
        "vocabulary_translations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vocabulary_id", sa.Integer(), nullable=False),
        sa.Column("language_code", sa.String(length=8), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["vocabulary_id"], ["vocabulary_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "listening_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=False, server_default=""),
        sa.Column("audio_url", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "speaking_scenarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("situation", sa.Text(), nullable=False, server_default=""),
        sa.Column("tutor_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("level_code", sa.String(length=8), nullable=False, server_default="A1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("pass_mark", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "content_reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("reviewer_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_reviews_entity", "content_reviews", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_table("content_reviews")
    op.drop_table("assessments")
    op.drop_table("speaking_scenarios")
    op.drop_table("listening_items")
    op.drop_table("vocabulary_translations")
    op.drop_table("vocabulary_items")
    op.drop_table("grammar_topics")
    op.drop_table("learning_objectives")
    op.drop_table("lesson_sections")
    op.drop_column("exercises", "status")
    op.drop_column("exercises", "order_index")
    op.drop_column("exercises", "learning_objective")
    op.drop_column("exercises", "marks")
    op.drop_column("exercises", "difficulty")
    op.drop_column("exercises", "feedback")
    op.drop_column("exercises", "explanation")
    op.drop_column("exercises", "prompt")
    op.drop_column("lessons", "status")
    op.drop_column("lessons", "summary")
    op.drop_constraint("fk_units_course_id", "units", type_="foreignkey")
    op.drop_index("ix_units_level_code", table_name="units")
    op.drop_index("ix_units_course_id", table_name="units")
    op.drop_column("units", "status")
    op.drop_column("units", "outcome")
    op.drop_column("units", "description")
    op.drop_column("units", "level_code")
    op.drop_column("units", "course_id")
    op.drop_table("courses")
    op.drop_table("cefr_levels")
