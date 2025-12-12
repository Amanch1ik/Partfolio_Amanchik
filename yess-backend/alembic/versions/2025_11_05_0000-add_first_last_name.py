"""add first_name and last_name to users

Revision ID: add_first_last_name
Revises: 0adb6f368a12
Create Date: 2025-11-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_first_last_name'
down_revision = '0adb6f368a12'
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем поля first_name и last_name
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=True))
    
    # Делаем поле name nullable для обратной совместимости
    op.alter_column('users', 'name',
               existing_type=sa.String(length=255),
               nullable=True)


def downgrade():
    # Удаляем добавленные поля
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
    
    # Возвращаем name в NOT NULL
    op.alter_column('users', 'name',
               existing_type=sa.String(length=255),
               nullable=False)

