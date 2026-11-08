"""Create user_profiles for onboarding answers.

Revision ID: d5b2profile001
Revises: c4a1cms00001
Create Date: 2026-11-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5b2profile001"
down_revision: Union[str, Sequence[str], None] = "c4a1cms00001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("level", sa.String(length=16), nullable=False, server_default=""),
        sa.Column("goals", sa.Text(), nullable=False, server_default=""),
        sa.Column("preferred_voice", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
