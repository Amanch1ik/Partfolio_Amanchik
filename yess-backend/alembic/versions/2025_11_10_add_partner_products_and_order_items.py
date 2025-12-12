"""Add partner products and order items

Revision ID: add_partner_products
Revises: 0adb6f368a12
Create Date: 2025-11-10 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_partner_products'
down_revision = '0adb6f368a12'
branch_labels = None
depends_on = None


def upgrade():
    # Создание таблицы partner_products
    op.create_table(
        'partner_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('partner_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('name_kg', sa.String(length=200), nullable=True),
        sa.Column('name_ru', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_kg', sa.Text(), nullable=True),
        sa.Column('description_ru', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('images', sa.Text(), nullable=True),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=True),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('weight', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('volume', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('original_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('price >= 0', name='check_positive_price'),
        sa.CheckConstraint('discount_percent >= 0 AND discount_percent <= 100', name='check_discount_range'),
        sa.CheckConstraint('stock_quantity IS NULL OR stock_quantity >= 0', name='check_positive_stock')
    )
    op.create_index(op.f('ix_partner_products_id'), 'partner_products', ['id'], unique=False)
    op.create_index(op.f('ix_partner_products_partner_id'), 'partner_products', ['partner_id'], unique=False)
    op.create_index(op.f('ix_partner_products_category'), 'partner_products', ['category'], unique=False)
    op.create_index(op.f('ix_partner_products_is_available'), 'partner_products', ['is_available'], unique=False)
    op.create_index('idx_product_partner_category', 'partner_products', ['partner_id', 'category', 'is_available'], unique=False)
    op.create_index('idx_product_available', 'partner_products', ['is_available', 'partner_id'], unique=False)
    
    # Создание таблицы order_items
    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('product_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['partner_products.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('quantity > 0', name='check_positive_quantity'),
        sa.CheckConstraint('subtotal >= 0', name='check_positive_subtotal')
    )
    op.create_index(op.f('ix_order_items_id'), 'order_items', ['id'], unique=False)
    op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
    op.create_index(op.f('ix_order_items_product_id'), 'order_items', ['product_id'], unique=False)
    op.create_index('idx_order_item_order', 'order_items', ['order_id'], unique=False)
    op.create_index('idx_order_item_product', 'order_items', ['product_id'], unique=False)
    
    # Обновление таблицы orders
    op.add_column('orders', sa.Column('cashback_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('orders', sa.Column('status', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('delivery_address', sa.String(length=500), nullable=True))
    op.add_column('orders', sa.Column('delivery_type', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('delivery_notes', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('transaction_id', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('payment_method', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('payment_status', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('paid_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('cancelled_at', sa.DateTime(), nullable=True))
    
    # Установка значений по умолчанию
    op.execute("UPDATE orders SET cashback_amount = 0 WHERE cashback_amount IS NULL")
    op.execute("UPDATE orders SET status = 'pending' WHERE status IS NULL")
    op.execute("UPDATE orders SET delivery_type = 'pickup' WHERE delivery_type IS NULL")
    op.execute("UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL")
    
    # Делаем поля обязательными
    op.alter_column('orders', 'cashback_amount', nullable=False)
    op.alter_column('orders', 'status', nullable=False)
    op.alter_column('orders', 'delivery_type', nullable=False)
    op.alter_column('orders', 'payment_status', nullable=False)
    
    # Добавление индексов
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    
    # Добавление внешнего ключа для transaction_id
    op.create_foreign_key('fk_orders_transaction_id', 'orders', 'transactions', ['transaction_id'], ['id'])
    
    # Обновление таблицы transactions
    op.add_column('transactions', sa.Column('order_id', sa.Integer(), nullable=True))
    op.add_column('transactions', sa.Column('commission', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('transactions', sa.Column('payment_method', sa.String(length=50), nullable=True))
    op.add_column('transactions', sa.Column('gateway_transaction_id', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('error_message', sa.Text(), nullable=True))
    op.add_column('transactions', sa.Column('processed_at', sa.DateTime(), nullable=True))
    
    # Установка значений по умолчанию
    op.execute("UPDATE transactions SET commission = 0 WHERE commission IS NULL")
    op.alter_column('transactions', 'commission', nullable=False)
    
    # Добавление внешнего ключа
    op.create_foreign_key('fk_transactions_order_id', 'transactions', 'orders', ['order_id'], ['id'])
    
    # Добавление индекса
    op.create_index(op.f('ix_transactions_order_id'), 'transactions', ['order_id'], unique=False)


def downgrade():
    # Удаление индексов и колонок из transactions
    op.drop_index(op.f('ix_transactions_order_id'), table_name='transactions')
    op.drop_constraint('fk_transactions_order_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'processed_at')
    op.drop_column('transactions', 'error_message')
    op.drop_column('transactions', 'gateway_transaction_id')
    op.drop_column('transactions', 'payment_method')
    op.drop_column('transactions', 'commission')
    op.drop_column('transactions', 'order_id')
    
    # Удаление колонок из orders
    op.drop_constraint('fk_orders_transaction_id', 'orders', type_='foreignkey')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_column('orders', 'cancelled_at')
    op.drop_column('orders', 'completed_at')
    op.drop_column('orders', 'paid_at')
    op.drop_column('orders', 'payment_status')
    op.drop_column('orders', 'payment_method')
    op.drop_column('orders', 'transaction_id')
    op.drop_column('orders', 'delivery_notes')
    op.drop_column('orders', 'delivery_type')
    op.drop_column('orders', 'delivery_address')
    op.drop_column('orders', 'status')
    op.drop_column('orders', 'cashback_amount')
    
    # Удаление таблиц
    op.drop_table('order_items')
    op.drop_table('partner_products')

