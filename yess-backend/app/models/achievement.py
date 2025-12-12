"""
Модели для системы достижений и уровней
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime
import enum

class AchievementCategory(str, enum.Enum):
    TRANSACTION = "transaction"
    REFERRAL = "referral"
    LOYALTY = "loyalty"
    SOCIAL = "social"
    SPECIAL = "special"

class AchievementRarity(str, enum.Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

class Achievement(Base):
    """Модель достижения"""
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(AchievementCategory), nullable=False, index=True)
    rarity = Column(Enum(AchievementRarity), default=AchievementRarity.COMMON)
    points = Column(Integer, default=0)  # Очки за получение достижения
    icon = Column(String(255), nullable=True)  # Иконка достижения
    
    # Требования для получения достижения
    requirements = Column(JSON, nullable=False)  # {"type": "transaction_count", "count": 10}
    
    # Метаданные
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserAchievement(Base):
    """Достижения пользователей"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False, index=True)
    
    # Прогресс достижения
    progress = Column(JSON, nullable=True)  # {"current": 5, "required": 10}
    
    # Временные метки
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    user = relationship("User", back_populates="user_achievements")
    achievement = relationship("Achievement")

class UserLevel(Base):
    """Уровни пользователей"""
    __tablename__ = "user_levels"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Информация об уровне
    current_level = Column(Integer, default=1)
    current_points = Column(Integer, default=0)
    total_points_earned = Column(Integer, default=0)
    
    # Временные метки
    level_updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    user = relationship("User", back_populates="user_level")

class LevelReward(Base):
    """Награды за уровни"""
    __tablename__ = "level_rewards"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(Integer, nullable=False, index=True)
    
    # Информация о награде
    reward_type = Column(String(50), nullable=False)  # "bonus_points", "discount", "cashback"
    reward_value = Column(Float, nullable=False)  # Значение награды
    description = Column(String(255), nullable=False)
    
    # Метаданные
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class UserLevelReward(Base):
    """Полученные награды пользователей"""
    __tablename__ = "user_level_rewards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reward_id = Column(Integer, ForeignKey("level_rewards.id"), nullable=False, index=True)
    
    # Статус награды
    is_claimed = Column(Boolean, default=False)
    claimed_at = Column(DateTime, nullable=True)
    
    # Временные метки
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    user = relationship("User")
    reward = relationship("LevelReward")

class AchievementProgress(Base):
    """Прогресс по достижениям (для отслеживания)"""
    __tablename__ = "achievement_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False, index=True)
    
    # Текущий прогресс
    current_progress = Column(Integer, default=0)
    required_progress = Column(Integer, nullable=False)
    
    # Дополнительные данные прогресса
    progress_data = Column(JSON, nullable=True)
    
    # Временные метки
    last_updated = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    user = relationship("User")
    achievement = relationship("Achievement")
