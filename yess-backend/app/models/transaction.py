"""Transaction model"""
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, CheckConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)  # Partner involved in transaction
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)  # Order for payment transactions
    type = Column(String(50), nullable=False, index=True)  # topup, discount, bonus, refund, payment
    amount = Column(Numeric(10, 2), nullable=False)
    commission = Column(Numeric(10, 2), default=0.0)  # Commission for payment
    payment_method = Column(String(50), nullable=True)  # bank_card, elsom, etc.
    gateway_transaction_id = Column(String(255), nullable=True)  # ID from payment gateway
    error_message = Column(Text, nullable=True)  # Error message if failed
    processed_at = Column(DateTime, nullable=True)  # When transaction was processed
    balance_before = Column(Numeric(10, 2))
    balance_after = Column(Numeric(10, 2))
    status = Column(String(50), nullable=False, index=True)  # pending, completed, failed
    payment_url = Column(String(500))
    qr_code_data = Column(Text)
    
    # Additional fields for QR payment tracking
    yescoin_used = Column(Numeric(10, 2), default=0.0)  # YesCoin spent
    yescoin_earned = Column(Numeric(10, 2), default=0.0)  # Cashback earned
    description = Column(Text)  # Transaction description
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime)
    
    __table_args__ = (
        CheckConstraint('amount > 0', name='check_positive_amount'),
        # Составные индексы для оптимизации запросов
        Index('idx_transaction_user_status', 'user_id', 'status', 'created_at'),
        Index('idx_transaction_type_status', 'type', 'status', 'created_at'),
        Index('idx_transaction_date_range', 'created_at', 'status'),
        Index('idx_transaction_partner', 'partner_id', 'created_at'),
    )
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    partner = relationship("Partner", back_populates="transactions")
    order = relationship("Order", foreign_keys=[order_id], uselist=False)
    refunds = relationship("Refund", back_populates="transaction")

