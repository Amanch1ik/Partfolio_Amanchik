"""
Модели для системы уведомлений
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime
import enum

class NotificationType(str, enum.Enum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"

class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"
    READ = "read"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    """Модель уведомления"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False, index=True)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, index=True)
    data = Column(JSON, nullable=True)  # Дополнительные данные для уведомления
    
    # Временные метки
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)  # Запланированное время отправки
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    
    # Связи
    user = relationship("User", back_populates="notifications")

class NotificationTemplate(Base):
    """Шаблоны уведомлений"""
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    title_template = Column(String(255), nullable=False)
    message_template = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    variables = Column(JSON, nullable=True)  # Список переменных в шаблоне
    
    # Метаданные
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NotificationSettings(Base):
    """Настройки уведомлений пользователя"""
    __tablename__ = "notification_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Настройки по типам уведомлений
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    
    # Настройки по категориям
    marketing_enabled = Column(Boolean, default=True)  # Маркетинговые уведомления
    transaction_enabled = Column(Boolean, default=True)  # Уведомления о транзакциях
    promotion_enabled = Column(Boolean, default=True)  # Уведомления об акциях
    system_enabled = Column(Boolean, default=True)  # Системные уведомления
    
    # Время тишины (не отправлять уведомления в это время)
    quiet_hours_start = Column(String(5), nullable=True)  # "22:00"
    quiet_hours_end = Column(String(5), nullable=True)  # "08:00"
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Связи
    user = relationship("User", back_populates="notification_settings")

class NotificationLog(Base):
    """Лог отправки уведомлений для отладки"""
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)
    attempt_number = Column(Integer, default=1)
    status = Column(Enum(NotificationStatus), nullable=False)
    error_message = Column(Text, nullable=True)
    response_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    notification = relationship("Notification")
