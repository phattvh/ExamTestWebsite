"""rbac_models

Revision ID: f1234567890a
Revises: 1ab8aa4cf881
Create Date: 2026-08-08 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1234567890a'
down_revision: Union[str, None] = '1ab8aa4cf881'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # 1. Add columns temporarily allowing nulls
    op.add_column('exams', sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('exams', sa.Column('is_public', sa.Boolean(), server_default='false', nullable=False))
    
    # 2. Check for invalid UUIDs in created_by before casting
    try:
        # Regex to validate UUID format
        invalid_rows = connection.execute(sa.text("SELECT id, created_by FROM exams WHERE created_by::text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND created_by IS NOT NULL")).fetchall()
        if invalid_rows:
            print(f"\nCRITICAL ERROR: Migration safely stopped. Invalid UUIDs found in exams.created_by: {invalid_rows}")
            raise Exception("Invalid UUID format in created_by column")
    except Exception as e:
        # If the regex fails or raises Exception, we halt
        raise e
        
    # 3. Perform the migration
    connection.execute(sa.text("UPDATE exams SET owner_id = created_by::uuid"))
    
    # 4. Enforce NOT NULL and remove old column
    op.alter_column('exams', 'owner_id', nullable=False)
    op.drop_index('idx_exams_created_by', table_name='exams')
    op.drop_column('exams', 'created_by')
    op.create_index('idx_exams_owner_id', 'exams', ['owner_id'])
    
    # 5. Create new tables
    op.create_table('exam_collaborators',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=True, server_default='CO_TEACHER'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_exam_collaborators_exam_user', 'exam_collaborators', ['exam_id', 'user_id'], unique=True)
    
    op.create_table('exam_proctors',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_exam_proctors_exam_user', 'exam_proctors', ['exam_id', 'user_id'], unique=True)
    
    op.create_table('exam_roster',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_exam_roster_exam_user', 'exam_roster', ['exam_id', 'user_id'], unique=True)
    
    op.create_table('exam_question_snapshots',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('question_id', sa.String(length=64), nullable=False),
    sa.Column('question_version', sa.Integer(), nullable=True, server_default='1'),
    sa.Column('question_text', sa.Text(), nullable=False),
    sa.Column('choices', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('correct_answer', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('points', sa.Float(), nullable=True, server_default='1.0'),
    sa.Column('explanation', sa.Text(), nullable=True),
    sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('display_order', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_exam_snapshots_exam_question', 'exam_question_snapshots', ['exam_id', 'question_id'], unique=True)


def downgrade() -> None:
    pass
