"""add password reset token fields

Revision ID: a7b8c9d0e1f2
Revises: e62c2846dc50
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'e62c2846dc50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Lưu hash của token reset mật khẩu (không lưu token gốc — giống cách lưu mật khẩu),
    # kèm thời hạn sử dụng để token tự hết hạn sau 1 khoảng thời gian ngắn.
    op.add_column('users', sa.Column('reset_token_hash', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'reset_token_expires_at')
    op.drop_column('users', 'reset_token_hash')
