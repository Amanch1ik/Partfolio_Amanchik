"""Story model for temporary promotions and announcements"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.core.database import Base
import enum


class StoryType(str, enum.Enum):
    PROMOTION = "promotion"  # Связан с акцией
    ANNOUNCEMENT = "announcement"  # Объявление
    PARTNER = "partner"  # Сторис партнера
    SYSTEM = "system"  # Системное уведомление


class StoryActionType(str, enum.Enum):
    OPEN_PARTNER = "open_partner"  # Открыть страницу партнера
    OPEN_PROMOTION = "open_promotion"  # Открыть акцию
    OPEN_URL = "open_url"  # Открыть внешний URL
    OPEN_PRODUCT = "open_product"  # Открыть товар
    NONE = "none"  # Без действия


class StoryStatus(str, enum.Enum):
    DRAFT = "draft"  # Черновик
    SCHEDULED = "scheduled"  # Запланирован
    ACTIVE = "active"  # Активен
    ARCHIVED = "archived"  # Архивирован
    EXPIRED = "expired"  # Истек


class Story(Base):
    """Story model for temporary promotions (like Instagram stories)"""
    __tablename__ = "stories"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Тип сториса
    story_type = Column(String(50), nullable=False, default=StoryType.ANNOUNCEMENT.value, index=True)
    
    # Связи
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Кто создал
    
    # Контент
    title = Column(String(255), nullable=False)
    title_kg = Column(String(255), nullable=True)  # На кыргызском
    title_ru = Column(String(255), nullable=True)  # На русском
    description = Column(Text, nullable=True)
    description_kg = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    
    # Медиа
    image_url = Column(String(500), nullable=False)  # Главное изображение
    video_url = Column(String(500), nullable=True)  # Видео (опционально)
    thumbnail_url = Column(String(500), nullable=True)  # Миниатюра для списка
    
    # Временные рамки
    expires_at = Column(DateTime, nullable=False, index=True)  # Когда исчезнет
    scheduled_at = Column(DateTime, nullable=True, index=True)  # Когда опубликовать
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Статус и настройки
    status = Column(String(50), default=StoryStatus.DRAFT.value, index=True)
    is_active = Column(Boolean, default=True, index=True)
    priority = Column(Integer, default=0, index=True)  # Приоритет отображения (больше = выше)
    
    # Целевая аудитория
    target_audience = Column(String(50), default="all")  # "all", "city", "partner", "users"
    target_user_ids = Column(Text, nullable=True)  # JSON массив ID пользователей (для персональных)
    
    # Действие при клике
    action_type = Column(String(50), default=StoryActionType.NONE.value)
    action_value = Column(String(500), nullable=True)  # ID партнера/акции/товара или URL
    
    # Статистика
    views_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    
    # Дополнительные настройки
    auto_delete = Column(Boolean, default=True)  # Автоматически удалить после истечения
    show_timer = Column(Boolean, default=True)  # Показывать таймер обратного отсчета
    
    __table_args__ = (
        CheckConstraint('priority >= 0', name='check_positive_priority'),
        CheckConstraint('views_count >= 0', name='check_positive_views'),
        CheckConstraint('clicks_count >= 0', name='check_positive_clicks'),
        Index('idx_story_active_expires', 'is_active', 'expires_at', 'status'),
        Index('idx_story_partner_active', 'partner_id', 'is_active', 'expires_at'),
        Index('idx_story_city_active', 'city_id', 'is_active', 'expires_at'),
    )
    
    # Relationships
    partner = relationship("Partner", foreign_keys=[partner_id])
    promotion = relationship("Promotion", foreign_keys=[promotion_id])
    city = relationship("City", foreign_keys=[city_id])
    creator = relationship("User", foreign_keys=[created_by])


class StoryView(Base):
    """История просмотров сторисов пользователями"""
    __tablename__ = "story_views"
    
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_story_view_unique', 'story_id', 'user_id', unique=True),
        Index('idx_story_view_user', 'user_id', 'viewed_at'),
    )
    
    # Relationships
    story = relationship("Story", foreign_keys=[story_id])
    user = relationship("User", foreign_keys=[user_id])


class StoryClick(Base):
    """История кликов по сторисам"""
    __tablename__ = "story_clicks"
    
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    clicked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    action_type = Column(String(50), nullable=True)  # Какой тип действия был выполнен
    
    __table_args__ = (
        Index('idx_story_click_story', 'story_id', 'clicked_at'),
        Index('idx_story_click_user', 'user_id', 'clicked_at'),
    )
    
    # Relationships
    story = relationship("Story", foreign_keys=[story_id])
    user = relationship("User", foreign_keys=[user_id])

