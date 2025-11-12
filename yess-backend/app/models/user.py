"""User model"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основная информация
    name = Column(String(255), nullable=True)  # Оставляем для обратной совместимости
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255))
    
    # Профиль
    avatar_url = Column(String(500), nullable=True)  # URL изображения профиля
    bio = Column(Text, nullable=True)  # Описание профиля
    address = Column(String(500), nullable=True)  # Адрес
    
    # Верификация
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String(10), nullable=True)  # Код подтверждения
    verification_expires_at = Column(DateTime, nullable=True)
    
    # Push уведомления
    device_tokens = Column(JSON, default=list)  # Firebase device tokens
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    
    # Геолокация
    city_id = Column(Integer, ForeignKey("cities.id"))
    latitude = Column(String(50), nullable=True)
    longitude = Column(String(50), nullable=True)
    
    # Реферальная система
    referral_code = Column(String(50), unique=True, index=True)
    referred_by = Column(Integer, ForeignKey("users.id"))
    
    # Активность
    is_active = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    city = relationship("City", back_populates="users")
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    roles = relationship("UserRole", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    orders = relationship("Order", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    notification_settings = relationship("NotificationSettings", back_populates="user", uselist=False)
    user_achievements = relationship("UserAchievement", back_populates="user")
    user_level = relationship("UserLevel", back_populates="user", uselist=False)
    user_promo_codes = relationship("UserPromoCode", back_populates="user")
    # agent = relationship("Agent", back_populates="user", uselist=False)
    # referrals_given = relationship("Referral", foreign_keys="Referral.referred_user_id", back_populates="referred_user")
    
    # Оптимизированные индексы для частых запросов
    __table_args__ = (
        Index('idx_user_location', 'city_id', 'latitude', 'longitude'),
        Index('idx_user_activity', 'is_active', 'last_login_at'),
        Index('idx_user_referral', 'referral_code', 'referred_by'),
        Index('idx_user_verification', 'phone_verified', 'email_verified'),
    )

