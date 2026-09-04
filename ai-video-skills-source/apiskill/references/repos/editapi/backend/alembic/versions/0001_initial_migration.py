"""Initial migration

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    variant_kind = postgresql.ENUM('trim', 'overlay', 'watermark', 'transcode', name='variantkind')
    variant_kind.create(op.get_bind(), checkfirst=True)
    
    variant_quality = postgresql.ENUM('source', '1080p', '720p', '480p', name='variantquality')
    variant_quality.create(op.get_bind(), checkfirst=True)
    
    job_type = postgresql.ENUM('upload_probe', 'trim', 'overlay', 'watermark', 'transcode_multi', name='jobtype')
    job_type.create(op.get_bind(), checkfirst=True)
    
    job_status = postgresql.ENUM('PENDING', 'STARTED', 'SUCCESS', 'FAILURE', name='jobstatus')
    job_status.create(op.get_bind(), checkfirst=True)
    
    overlay_type = postgresql.ENUM('text', 'image', 'video', 'watermark', name='overlaytype')
    overlay_type.create(op.get_bind(), checkfirst=True)

    # Create videos table
    op.create_table('videos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('original_filename', sa.Text(), nullable=False),
        sa.Column('stored_path', sa.Text(), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('duration_sec', sa.Numeric(precision=10, scale=3), nullable=True),
        sa.Column('mime_type', sa.Text(), nullable=False),
        sa.Column('upload_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create video_variants table
    op.create_table('video_variants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kind', postgresql.ENUM('trim', 'overlay', 'watermark', 'transcode', name='variantkind', create_type=False), nullable=False),
        sa.Column('quality', postgresql.ENUM('source', '1080p', '720p', '480p', name='variantquality', create_type=False), nullable=True),
        sa.Column('source_variant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stored_path', sa.Text(), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('duration_sec', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('config_json', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['source_variant_id'], ['video_variants.id'], ),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create overlays table
    op.create_table('overlays',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('variant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', postgresql.ENUM('text', 'image', 'video', 'watermark', name='overlaytype', create_type=False), nullable=False),
        sa.Column('payload_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['variant_id'], ['video_variants.id'], ),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create jobs table
    op.create_table('jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('input_variant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('output_variant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', postgresql.ENUM('upload_probe', 'trim', 'overlay', 'watermark', 'transcode_multi', name='jobtype', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'STARTED', 'SUCCESS', 'FAILURE', name='jobstatus', create_type=False), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['input_variant_id'], ['video_variants.id'], ),
        sa.ForeignKeyConstraint(['output_variant_id'], ['video_variants.id'], ),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_video_variants_video_id', 'video_variants', ['video_id'])
    op.create_index('ix_jobs_status_created_at', 'jobs', ['status', 'created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_jobs_status_created_at', table_name='jobs')
    op.drop_index('ix_video_variants_video_id', table_name='video_variants')
    
    # Drop tables
    op.drop_table('jobs')
    op.drop_table('overlays')
    op.drop_table('video_variants')
    op.drop_table('videos')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS overlaytype')
    op.execute('DROP TYPE IF EXISTS jobstatus')
    op.execute('DROP TYPE IF EXISTS jobtype')
    op.execute('DROP TYPE IF EXISTS variantquality')
    op.execute('DROP TYPE IF EXISTS variantkind')
