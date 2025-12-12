"""
Модели для системы акций и промо-кодов
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime
import enum

class PromotionCategory(str, enum.Enum):
    GENERAL = "general"
    PARTNER = "partner"
    SEASONAL = "seasonal"
    REFERRAL = "referral"
    LOYALTY = "loyalty"
    SPECIAL = "special"

class PromotionType(str, enum.Enum):
    DISCOUNT_PERCENT = "discount_percent"
    DISCOUNT_AMOUNT = "discount_amount"
    CASHBACK = "cashback"
    BONUS_POINTS = "bonus_points"
    FREE_SHIPPING = "free_shipping"
    GIFT = "gift"

class PromoCodeType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FREE_SHIPPING = "free_shipping"
    BONUS_POINTS = "bonus_points"

class PromotionStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PromoCodeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    USED = "used"
    CANCELLED = "cancelled"

class Promotion(Base):
    """Акции и промо-кампании"""
    __tablename__ = "promotions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(PromotionCategory), nullable=False, index=True)
    promotion_type = Column(Enum(PromotionType), nullable=False)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)
    
    # Условия акции
    discount_percent = Column(Float, nullable=True)  # Процент скидки
    discount_amount = Column(Float, nullable=True)  # Фиксированная скидка
    min_order_amount = Column(Float, nullable=True)  # Минимальная сумма заказа
    max_discount_amount = Column(Float, nullable=True)  # Максимальная скидка
    
    # Ограничения
    usage_limit = Column(Integer, nullable=True)  # Общий лимит использования
    usage_limit_per_user = Column(Integer, default=1)  # Лимит на пользователя
    usage_count = Column(Integer, default=0)  # Текущее количество использований
    
    # Временные рамки
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    
    # Статус
    status = Column(Enum(PromotionStatus), default=PromotionStatus.DRAFT, index=True)
    
    # Дополнительные условия
    conditions = Column(Text, nullable=True)  # JSON с дополнительными условиями
    
    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Связи
    partner = relationship("Partner", back_populates="promotions")
    promo_codes = relationship("PromoCode", back_populates="promotion")

class PromoCode(Base):
    """Промо-коды"""
    __tablename__ = "promo_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False, index=True)
    promo_type = Column(Enum(PromoCodeType), nullable=False)
    
    # Условия промо-кода
    discount_percent = Column(Float, nullable=True)
    discount_amount = Column(Float, nullable=True)
    
    # Ограничения
    usage_limit = Column(Integer, nullable=True)
    usage_limit_per_user = Column(Integer, default=1)
    usage_count = Column(Integer, default=0)
    
    # Временные рамки
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    
    # Статус
    status = Column(Enum(PromoCodeStatus), default=PromoCodeStatus.ACTIVE, index=True)
    
    # Дополнительные условия
    conditions = Column(Text, nullable=True)  # JSON с дополнительными условиями
    
    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Связи
    promotion = relationship("Promotion", back_populates="promo_codes")
    user_promo_codes = relationship("UserPromoCode", back_populates="promo_code")

class UserPromoCode(Base):
    """Использование промо-кодов пользователями"""
    __tablename__ = "user_promo_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    
    # Информация об использовании
    discount_amount = Column(Float, nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    user = relationship("User", back_populates="user_promo_codes")
    promo_code = relationship("PromoCode", back_populates="user_promo_codes")
    order = relationship("Order")

class PromotionUsage(Base):
    """Использование акций"""
    __tablename__ = "promotion_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    
    # Информация об использовании
    discount_amount = Column(Float, nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    promotion = relationship("Promotion")
    user = relationship("User")
    order = relationship("Order")

class PromoCodeGeneration(Base):
    """Лог генерации промо-кодов"""
    __tablename__ = "promo_code_generations"
    
    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False, index=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Информация о генерации
    codes_count = Column(Integer, nullable=False)
    code_length = Column(Integer, nullable=False)
    codes = Column(Text, nullable=False)  # JSON массив сгенерированных кодов
    
    # Временные метки
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    promotion = relationship("Promotion")
    generator = relationship("User")
