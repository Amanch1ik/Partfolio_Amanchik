"""Add stories system

Revision ID: add_stories
Revises: add_partner_products
Create Date: 2025-11-10 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_stories'
down_revision = 'add_partner_products'
branch_labels = None
depends_on = None


def upgrade():
    # Создание таблицы stories
    op.create_table(
        'stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_type', sa.String(length=50), nullable=False),
        sa.Column('partner_id', sa.Integer(), nullable=True),
        sa.Column('promotion_id', sa.Integer(), nullable=True),
        sa.Column('city_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('title_kg', sa.String(length=255), nullable=True),
        sa.Column('title_ru', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_kg', sa.Text(), nullable=True),
        sa.Column('description_ru', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('video_url', sa.String(length=500), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('target_audience', sa.String(length=50), nullable=True),
        sa.Column('target_user_ids', sa.Text(), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=True),
        sa.Column('action_value', sa.String(length=500), nullable=True),
        sa.Column('views_count', sa.Integer(), nullable=True),
        sa.Column('clicks_count', sa.Integer(), nullable=True),
        sa.Column('shares_count', sa.Integer(), nullable=True),
        sa.Column('auto_delete', sa.Boolean(), nullable=True),
        sa.Column('show_timer', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id'], ),
        sa.ForeignKeyConstraint(['promotion_id'], ['promotions.id'], ),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('priority >= 0', name='check_positive_priority'),
        sa.CheckConstraint('views_count >= 0', name='check_positive_views'),
        sa.CheckConstraint('clicks_count >= 0', name='check_positive_clicks')
    )
    op.create_index(op.f('ix_stories_id'), 'stories', ['id'], unique=False)
    op.create_index(op.f('ix_stories_story_type'), 'stories', ['story_type'], unique=False)
    op.create_index(op.f('ix_stories_partner_id'), 'stories', ['partner_id'], unique=False)
    op.create_index(op.f('ix_stories_promotion_id'), 'stories', ['promotion_id'], unique=False)
    op.create_index(op.f('ix_stories_city_id'), 'stories', ['city_id'], unique=False)
    op.create_index(op.f('ix_stories_expires_at'), 'stories', ['expires_at'], unique=False)
    op.create_index(op.f('ix_stories_scheduled_at'), 'stories', ['scheduled_at'], unique=False)
    op.create_index(op.f('ix_stories_status'), 'stories', ['status'], unique=False)
    op.create_index(op.f('ix_stories_is_active'), 'stories', ['is_active'], unique=False)
    op.create_index(op.f('ix_stories_priority'), 'stories', ['priority'], unique=False)
    op.create_index('idx_story_active_expires', 'stories', ['is_active', 'expires_at', 'status'], unique=False)
    op.create_index('idx_story_partner_active', 'stories', ['partner_id', 'is_active', 'expires_at'], unique=False)
    op.create_index('idx_story_city_active', 'stories', ['city_id', 'is_active', 'expires_at'], unique=False)
    
    # Создание таблицы story_views
    op.create_table(
        'story_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('viewed_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['story_id'], ['stories.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('story_id', 'user_id', name='idx_story_view_unique')
    )
    op.create_index(op.f('ix_story_views_id'), 'story_views', ['id'], unique=False)
    op.create_index(op.f('ix_story_views_story_id'), 'story_views', ['story_id'], unique=False)
    op.create_index(op.f('ix_story_views_user_id'), 'story_views', ['user_id'], unique=False)
    op.create_index('idx_story_view_user', 'story_views', ['user_id', 'viewed_at'], unique=False)
    
    # Создание таблицы story_clicks
    op.create_table(
        'story_clicks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('clicked_at', sa.DateTime(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['story_id'], ['stories.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_story_clicks_id'), 'story_clicks', ['id'], unique=False)
    op.create_index(op.f('ix_story_clicks_story_id'), 'story_clicks', ['story_id'], unique=False)
    op.create_index(op.f('ix_story_clicks_user_id'), 'story_clicks', ['user_id'], unique=False)
    op.create_index('idx_story_click_story', 'story_clicks', ['story_id', 'clicked_at'], unique=False)
    op.create_index('idx_story_click_user', 'story_clicks', ['user_id', 'clicked_at'], unique=False)


def downgrade():
    op.drop_table('story_clicks')
    op.drop_table('story_views')
    op.drop_table('stories')

