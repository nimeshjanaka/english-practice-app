"""Add exercise_attempts, lesson_progress, and learning_sessions.

Revision ID: f7d4prog0001
Revises: e6c3speak0001
Create Date: 2026-11-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f7d4prog0001"
down_revision: Union[str, Sequence[str], None] = "e6c3speak0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

    op.create_table(
        "exercise_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("answer_payload", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exercise_attempts_user_id", "exercise_attempts", ["user_id"])
    op.create_index("ix_exercise_attempts_exercise_id", "exercise_attempts", ["exercise_id"])
    op.create_index("ix_exercise_attempts_lesson_id", "exercise_attempts", ["lesson_id"])

    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("exercises_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("exercises_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
    )
    op.create_index("ix_lesson_progress_user_id", "lesson_progress", ["user_id"])
    op.create_index("ix_lesson_progress_lesson_id", "lesson_progress", ["lesson_id"])

    op.create_table(
        "learning_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("session_type", sa.String(length=32), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("speaking_session_id", sa.String(length=32), nullable=True),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_sessions_user_id", "learning_sessions", ["user_id"])
    op.create_index("ix_learning_sessions_lesson_id", "learning_sessions", ["lesson_id"])
    op.create_index("ix_learning_sessions_speaking_session_id", "learning_sessions", ["speaking_session_id"])


def downgrade() -> None:
    op.drop_index("ix_learning_sessions_speaking_session_id", table_name="learning_sessions")
    op.drop_index("ix_learning_sessions_lesson_id", table_name="learning_sessions")
    op.drop_index("ix_learning_sessions_user_id", table_name="learning_sessions")
    op.drop_table("learning_sessions")
    op.drop_index("ix_lesson_progress_lesson_id", table_name="lesson_progress")
    op.drop_index("ix_lesson_progress_user_id", table_name="lesson_progress")
    op.drop_table("lesson_progress")
    op.drop_index("ix_exercise_attempts_lesson_id", table_name="exercise_attempts")
    op.drop_index("ix_exercise_attempts_exercise_id", table_name="exercise_attempts")
    op.drop_index("ix_exercise_attempts_user_id", table_name="exercise_attempts")
    op.drop_table("exercise_attempts")
