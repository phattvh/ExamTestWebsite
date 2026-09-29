"""add manual grading support (essay) + widen user_answer for multi-select/matching JSON

Revision ID: d3456789012c
Revises: c2345678901b
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd3456789012c'
down_revision: Union[str, None] = 'c2345678901b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user_answer trước đây là String(255) — không đủ cho câu tự luận dài hoặc
    # đáp án JSON của câu chọn-nhiều-đáp-án/nối cột. Đổi sang Text.
    op.alter_column('question_results', 'user_answer',
                     existing_type=sa.String(length=255),
                     type_=sa.Text(),
                     existing_nullable=True)

    op.add_column('question_results', sa.Column('needs_manual_grading', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('question_results', sa.Column('graded_by_user_id', sa.String(length=50), nullable=True))
    op.add_column('question_results', sa.Column('manual_grading_note', sa.Text(), nullable=True))

    op.add_column('results', sa.Column('has_pending_manual_grading', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('results', 'has_pending_manual_grading')
    op.drop_column('question_results', 'manual_grading_note')
    op.drop_column('question_results', 'graded_by_user_id')
    op.drop_column('question_results', 'needs_manual_grading')
    op.alter_column('question_results', 'user_answer',
                     existing_type=sa.Text(),
                     type_=sa.String(length=255),
                     existing_nullable=True)
