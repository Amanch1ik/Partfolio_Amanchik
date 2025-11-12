"""Partner Product/Service models"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class PartnerProduct(Base):
    __tablename__ = "partner_products"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)
    
    # Название товара/услуги
    name = Column(String(200), nullable=False)
    name_kg = Column(String(200))  # На кыргызском
    name_ru = Column(String(200))   # На русском
    
    # Описание
    description = Column(Text)
    description_kg = Column(Text)
    description_ru = Column(Text)
    
    # Цена и категория
    price = Column(Numeric(10, 2), nullable=False)
    category = Column(String(50), index=True)  # "food", "service", "product", "drink"
    
    # Изображения
    image_url = Column(String(500))
    images = Column(Text)  # JSON массив URL изображений
    
    # Доступность
    is_available = Column(Boolean, default=True, index=True)
    stock_quantity = Column(Integer, nullable=True)  # Для товаров (null = неограничено)
    
    # Дополнительная информация
    sku = Column(String(100), unique=True, nullable=True)  # Артикул
    weight = Column(Numeric(8, 2), nullable=True)  # Вес в граммах
    volume = Column(Numeric(8, 2), nullable=True)  # Объем в мл
    
    # Скидки и акции
    discount_percent = Column(Numeric(5, 2), default=0.0)
    original_price = Column(Numeric(10, 2), nullable=True)  # Цена до скидки
    
    # Сортировка
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('price >= 0', name='check_positive_price'),
        CheckConstraint('discount_percent >= 0 AND discount_percent <= 100', name='check_discount_range'),
        CheckConstraint('stock_quantity IS NULL OR stock_quantity >= 0', name='check_positive_stock'),
        Index('idx_product_partner_category', 'partner_id', 'category', 'is_available'),
        Index('idx_product_available', 'is_available', 'partner_id'),
    )
    
    # Relationships
    partner = relationship("Partner", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("partner_products.id"), nullable=False)
    
    # Информация о товаре на момент заказа (для истории)
    product_name = Column(String(200), nullable=False)
    product_price = Column(Numeric(10, 2), nullable=False)
    
    # Количество и итоговая цена
    quantity = Column(Integer, nullable=False, default=1)
    subtotal = Column(Numeric(10, 2), nullable=False)  # price * quantity
    
    # Дополнительная информация
    notes = Column(Text)  # Примечания к товару (например, "без лука")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_positive_quantity'),
        CheckConstraint('subtotal >= 0', name='check_positive_subtotal'),
        Index('idx_order_item_order', 'order_id'),
        Index('idx_order_item_product', 'product_id'),
    )
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("PartnerProduct", back_populates="order_items")

