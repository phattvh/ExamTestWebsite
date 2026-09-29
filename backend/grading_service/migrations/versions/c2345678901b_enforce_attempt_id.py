"""enforce attempt_id unique and not null

Revision ID: c2345678901b
Revises: b1234567890a
Create Date: 2026-08-08 21:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c2345678901b'
down_revision: Union[str, None] = 'b1234567890a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    
    # 1. Handle legacy NULLs safely
    results_null = bind.execute(sa.text("SELECT count(1) FROM results WHERE attempt_id IS NULL")).scalar()
    submissions_null = bind.execute(sa.text("SELECT count(1) FROM submissions WHERE attempt_id IS NULL")).scalar()
    
    print(f"Migration: Found {results_null} results and {submissions_null} submissions with NULL attempt_id.")
    
    if results_null > 0 or submissions_null > 0:
        raise Exception(
            f"Migration failed safely: Found {results_null} legacy results and {submissions_null} legacy submissions "
            f"with NULL attempt_id. Do not silently delete or corrupt this data. "
            f"Please manually map these records to their corresponding ExamAttempt before applying this constraint."
        )

    # 2. Alter column to NOT NULL
    op.alter_column('results', 'attempt_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column('submissions', 'attempt_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    
    # 3. Add UNIQUE constraint (and drop old non-unique index)
    op.drop_index('idx_results_attempt', table_name='results')
    op.create_unique_constraint('uq_results_attempt_id', 'results', ['attempt_id'])
    
    op.drop_index('idx_submissions_attempt', table_name='submissions')
    op.create_unique_constraint('uq_submissions_attempt_id', 'submissions', ['attempt_id'])

def downgrade() -> None:
    op.drop_constraint('uq_submissions_attempt_id', 'submissions', type_='unique')
    op.create_index('idx_submissions_attempt', 'submissions', ['attempt_id'], unique=False)
    op.alter_column('submissions', 'attempt_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    
    op.drop_constraint('uq_results_attempt_id', 'results', type_='unique')
    op.create_index('idx_results_attempt', 'results', ['attempt_id'], unique=False)
    op.alter_column('results', 'attempt_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)
