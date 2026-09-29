"""remove_exam_assignment

Revision ID: e22e91248bc6
Revises: f1234567890a
Create Date: 2026-08-09 09:53:56.601797

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e22e91248bc6'
down_revision: Union[str, Sequence[str], None] = 'f1234567890a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('exam_assignments')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'exam_assignments',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('exam_id', sa.UUID(), sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('teacher_id', sa.String(50), nullable=False),
        sa.Column('role', sa.String(20), default='proctor'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('idx_exam_assignments_teacher_id', 'exam_assignments', ['teacher_id'])
