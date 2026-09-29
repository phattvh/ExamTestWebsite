"""add attempt_id

Revision ID: b1234567890a
Revises: afad998b9811
Create Date: 2026-08-08 21:18:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b1234567890a'
down_revision: Union[str, None] = 'afad998b9811'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('results', sa.Column('attempt_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('idx_results_attempt', 'results', ['attempt_id'], unique=False)
    
    op.add_column('submissions', sa.Column('attempt_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('idx_submissions_attempt', 'submissions', ['attempt_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_submissions_attempt', table_name='submissions')
    op.drop_column('submissions', 'attempt_id')
    
    op.drop_index('idx_results_attempt', table_name='results')
    op.drop_column('results', 'attempt_id')
