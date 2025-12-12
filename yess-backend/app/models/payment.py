"""
Модели для платежной системы Bonus APP
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from ..core.database import Base

class PaymentMethodEnum(str, enum.Enum):
    BANK_CARD = "bank_card"
    ELSOM = "elsom"
    MOBILE_BALANCE = "mobile_balance"
    ELKART = "elkart"
    CASH_TERMINAL = "cash_terminal"
    BANK_TRANSFER = "bank_transfer"

class PaymentStatusEnum(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Transaction model is defined in transaction.py to avoid duplicate table definition
# class Transaction(Base):
#     """Модель транзакции"""
#     __tablename__ = "transactions"
#     
#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
#     
#     # Основные данные транзакции
#     amount = Column(Float, nullable=False)  # Сумма в сомах
#     commission = Column(Float, default=0.0)  # Комиссия
#     total_amount = Column(Float, nullable=False)  # Общая сумма (amount + commission)
#     
#     # Метод оплаты и статус
#     payment_method = Column(Enum(PaymentMethodEnum), nullable=False)
#     status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDING)
#     
#     # Временные метки
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     processed_at = Column(DateTime(timezone=True), nullable=True)
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())
#     
#     # Дополнительная информация
#     gateway_transaction_id = Column(String(255), nullable=True)  # ID транзакции в платежном шлюзе
#     gateway_response = Column(Text, nullable=True)  # Ответ от платежного шлюза
#     error_message = Column(Text, nullable=True)  # Сообщение об ошибке
#     
#     # Метаданные
#     phone_number = Column(String(20), nullable=True)  # Номер телефона для мобильных платежей
#     card_last_four = Column(String(4), nullable=True)  # Последние 4 цифры карты
#     ip_address = Column(String(45), nullable=True)  # IP адрес пользователя
#     user_agent = Column(Text, nullable=True)  # User Agent браузера/приложения
#     
#     # Связи
#     user = relationship("User", back_populates="transactions")
#     refunds = relationship("Refund", back_populates="transaction")
#     
#     def __repr__(self):
#         return f"<Transaction(id={self.id}, user_id={self.user_id}, amount={self.amount}, status={self.status})>"

# Wallet model is defined in wallet.py to avoid duplicate table definition
# class Wallet(Base):
#     """Модель кошелька пользователя"""
#     __tablename__ = "wallets"
#     
#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
#     
#     # Баланс
#     balance = Column(Float, default=0.0)  # Текущий баланс в сомах
#     currency = Column(String(3), default="KGS")  # Валюта
#     
#     # Лимиты
#     daily_limit = Column(Float, default=50000.0)  # Дневной лимит
#     monthly_limit = Column(Float, default=500000.0)  # Месячный лимит
#     single_transaction_limit = Column(Float, default=100000.0)  # Лимит одной транзакции
#     
#     # Статистика использования лимитов
#     daily_used = Column(Float, default=0.0)  # Использовано за день
#     monthly_used = Column(Float, default=0.0)  # Использовано за месяц
#     last_daily_reset = Column(DateTime(timezone=True), server_default=func.now())
#     last_monthly_reset = Column(DateTime(timezone=True), server_default=func.now())
#     
#     # Временные метки
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())
#     
#     # Статус
#     is_active = Column(Boolean, default=True)
#     is_frozen = Column(Boolean, default=False)  # Заморожен ли кошелек
#     
#     # Связи
#     user = relationship("User", back_populates="wallet")
#     
#     def __repr__(self):
#         return f"<Wallet(user_id={self.user_id}, balance={self.balance})>"

class Refund(Base):
    """Модель возврата средств"""
    __tablename__ = "refunds"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Данные возврата
    amount = Column(Float, nullable=False)  # Сумма возврата
    reason = Column(Text, nullable=False)  # Причина возврата
    status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDING)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Дополнительная информация
    admin_notes = Column(Text, nullable=True)  # Заметки администратора
    gateway_refund_id = Column(String(255), nullable=True)  # ID возврата в платежном шлюзе
    
    # Связи
    transaction = relationship("Transaction", back_populates="refunds")
    user = relationship("User")
    
    def __repr__(self):
        return f"<Refund(id={self.id}, transaction_id={self.transaction_id}, amount={self.amount})>"

class PaymentMethod(Base):
    """Модель методов оплаты"""
    __tablename__ = "payment_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # Код метода (bank_card, elsom, etc.)
    name = Column(String(100), nullable=False)  # Название метода
    name_ky = Column(String(100), nullable=True)  # Название на кыргызском
    name_en = Column(String(100), nullable=True)  # Название на английском
    
    # Настройки комиссии
    commission_rate = Column(Float, nullable=False)  # Процент комиссии
    min_commission = Column(Float, default=0.0)  # Минимальная комиссия
    max_commission = Column(Float, nullable=True)  # Максимальная комиссия
    
    # Лимиты
    min_amount = Column(Float, default=10.0)  # Минимальная сумма
    max_amount = Column(Float, default=100000.0)  # Максимальная сумма
    
    # Настройки
    is_active = Column(Boolean, default=True)
    is_instant = Column(Boolean, default=False)  # Мгновенная обработка
    processing_time_minutes = Column(Integer, default=5)  # Время обработки в минутах
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<PaymentMethod(code={self.code}, name={self.name})>"

class PaymentAnalytics(Base):
    """Модель аналитики платежей"""
    __tablename__ = "payment_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Статистика по методам оплаты
    bank_card_count = Column(Integer, default=0)
    bank_card_amount = Column(Float, default=0.0)
    elsom_count = Column(Integer, default=0)
    elsom_amount = Column(Float, default=0.0)
    mobile_balance_count = Column(Integer, default=0)
    mobile_balance_amount = Column(Float, default=0.0)
    elkart_count = Column(Integer, default=0)
    elkart_amount = Column(Float, default=0.0)
    cash_terminal_count = Column(Integer, default=0)
    cash_terminal_amount = Column(Float, default=0.0)
    bank_transfer_count = Column(Integer, default=0)
    bank_transfer_amount = Column(Float, default=0.0)
    
    # Общая статистика
    total_transactions = Column(Integer, default=0)
    total_amount = Column(Float, default=0.0)
    total_commission = Column(Float, default=0.0)
    successful_transactions = Column(Integer, default=0)
    failed_transactions = Column(Integer, default=0)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<PaymentAnalytics(date={self.date}, total_amount={self.total_amount})>"
