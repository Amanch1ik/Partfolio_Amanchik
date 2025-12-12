"""Partner models"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, Date, CheckConstraint, JSON, Float, func, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# Geometry support - optional, requires geoalchemy2
try:
    from geoalchemy2 import Geometry
except ImportError:
    Geometry = None  # Will not use Geometry if geoalchemy2 is not installed


class Partner(Base):
    __tablename__ = "partners"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основная информация
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), index=True)
    city_id = Column(Integer, ForeignKey("cities.id"))
    
    # Изображения
    logo_url = Column(String(500))
    cover_image_url = Column(String(500))
    qr_code_url = Column(String(500))  # QR код для оплаты
    
    # Контактная информация
    phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(500))
    social_media = Column(JSON)  # {"instagram": "@yess", "facebook": "yess.kg"}
    
    # Финансы
    bank_account = Column(String(100))
    max_discount_percent = Column(Numeric(5, 2), nullable=False)
    cashback_rate = Column(Numeric(5, 2), default=5.0)  # % кэшбэка
    
    # Владелец
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Статусы
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)  # Проверен администрацией
    
    # Геолокационные данные
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Геометрия для пространственных запросов
    # geom = Column(Geometry('POINT'), nullable=True)  # Requires geoalchemy2
    
    # Дополнительные атрибуты
    default_cashback_rate = Column(Float, default=5.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('max_discount_percent >= 0 AND max_discount_percent <= 100', name='check_discount_range'),
        CheckConstraint('cashback_rate >= 0 AND cashback_rate <= 100', name='check_cashback_range'),
        # Оптимизированные индексы
        Index('idx_partner_location', 'city_id', 'latitude', 'longitude'),
        Index('idx_partner_status', 'is_active', 'is_verified', 'category'),
        Index('idx_partner_cashback', 'cashback_rate', 'is_active'),
        # GIST индекс для геопространственных запросов (создается через миграцию Alembic)
    )
    
    # Relationships
    city = relationship("City", back_populates="partners")
    locations = relationship("PartnerLocation", back_populates="partner")
    employees = relationship("PartnerEmployee", back_populates="partner")
    promotions = relationship("Promotion", back_populates="partner")  # Defined in promotion.py
    orders = relationship("Order", back_populates="partner")
    products = relationship("PartnerProduct", back_populates="partner", cascade="all, delete-orphan")
    # agent_bonuses = relationship("AgentPartnerBonus", back_populates="partner")
    transactions = relationship("Transaction", back_populates="partner")


class PartnerLocation(Base):
    __tablename__ = "partner_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False)
    address = Column(String(500))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    phone_number = Column(String(50))
    working_hours = Column(JSON)  # {"mon": "9:00-18:00", "tue": "9:00-18:00", ...}
    is_active = Column(Boolean, default=True)
    
    # Геолокационные данные
    # geom = Column(Geometry('POINT'), nullable=True)  # Requires geoalchemy2
    
    # Дополнительная информация о локации
    is_main_location = Column(Boolean, default=False)
    
    # Relationships
    partner = relationship("Partner", back_populates="locations")
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PartnerEmployee(Base):
    __tablename__ = "partner_employees"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    position = Column(String(100))  # cashier, manager, etc.
    hired_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    partner = relationship("Partner", back_populates="employees")


# Promotion model is defined in promotion.py to avoid duplicate table definition
# class Promotion(Base):
#     __tablename__ = "promotions"
#     
#     id = Column(Integer, primary_key=True, index=True)
#     partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False)
#     title = Column(String(255), nullable=False)
#     description = Column(Text)
#     discount_percent = Column(Integer)
#     valid_until = Column(Date)
#     is_active = Column(Boolean, default=True)
#     created_at = Column(DateTime, default=datetime.utcnow)
#     
#     # Relationships
#     partner = relationship("Partner", back_populates="promotions")

