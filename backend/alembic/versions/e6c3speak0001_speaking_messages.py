"""Create speaking_sessions and speaking_messages tables.

Revision ID: e6c3speak0001
Revises: d5b2profile001
Create Date: 2026-11-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6c3speak0001"
down_revision: Union[str, Sequence[str], None] = "d5b2profile001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "speaking_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_speaking_sessions_user_id", "speaking_sessions", ["user_id"])
    op.create_index("ix_speaking_sessions_lesson_id", "speaking_sessions", ["lesson_id"])

    op.create_table(
        "speaking_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(length=32), nullable=False),
        sa.Column("user_transcript", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_reply_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("grammar_correction", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_audio_url", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["speaking_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_speaking_messages_session_id", "speaking_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_speaking_messages_session_id", table_name="speaking_messages")
    op.drop_table("speaking_messages")
    op.drop_index("ix_speaking_sessions_lesson_id", table_name="speaking_sessions")
    op.drop_index("ix_speaking_sessions_user_id", table_name="speaking_sessions")
    op.drop_table("speaking_sessions")
