"""add requires_password_change

Revision ID: e62c2846dc50
Revises: f6601aa81721
Create Date: 2026-08-09 03:35:01.763653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e62c2846dc50'
down_revision: Union[str, Sequence[str], None] = 'f6601aa81721'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('requires_password_change', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'requires_password_change')
