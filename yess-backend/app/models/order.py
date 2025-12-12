"""Order model"""
from sqlalchemy import Column, Integer, Numeric, String, Text, DateTime, ForeignKey, CheckConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"  # Заказ создан, ожидает оплаты
    PAID = "paid"  # Оплачен
    PROCESSING = "processing"  # Обрабатывается партнером
    READY = "ready"  # Готов к выдаче/доставке
    COMPLETED = "completed"  # Завершен
    CANCELLED = "cancelled"  # Отменен
    REFUNDED = "refunded"  # Возврат средств


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)
    
    # Суммы
    order_total = Column(Numeric(10, 2), nullable=False)  # Сумма товаров
    discount = Column(Numeric(10, 2), nullable=False, default=0.0)  # Скидка
    cashback_amount = Column(Numeric(10, 2), nullable=False, default=0.0)  # Кэшбэк
    final_amount = Column(Numeric(10, 2), nullable=False)  # Итоговая сумма к оплате
    
    # Статус заказа
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, index=True)
    
    # Информация о доставке/получении
    delivery_address = Column(String(500), nullable=True)
    delivery_type = Column(String(50), default="pickup")  # "pickup", "delivery"
    delivery_notes = Column(Text, nullable=True)
    
    # Платежная информация
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)  # Связь с транзакцией
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(50), default="pending")  # "pending", "paid", "failed"
    
    # Идемпотентность
    idempotency_key = Column(String(255), unique=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    paid_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        CheckConstraint('order_total >= 0', name='check_positive_total'),
        CheckConstraint('discount >= 0', name='check_positive_discount'),
        CheckConstraint('discount <= order_total', name='check_discount_not_exceeds_total'),
        CheckConstraint('cashback_amount >= 0', name='check_positive_cashback'),
        CheckConstraint('final_amount >= 0', name='check_positive_final'),
    )
    
    # Relationships
    user = relationship("User", back_populates="orders")
    partner = relationship("Partner", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    transaction = relationship("Transaction", foreign_keys=[transaction_id], uselist=False)

