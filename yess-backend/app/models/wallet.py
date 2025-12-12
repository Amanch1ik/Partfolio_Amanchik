"""Wallet model"""
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Wallet(Base):
    __tablename__ = "wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Numeric(10, 2), default=0.00, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('balance >= 0', name='check_positive_balance'),
    )
    
    # Relationships
    user = relationship("User", back_populates="wallet")

