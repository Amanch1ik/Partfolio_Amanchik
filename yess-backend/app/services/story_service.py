"""Service for managing stories"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from decimal import Decimal

from app.models.story import Story, StoryView, StoryClick, StoryStatus
from app.models.user import User
from app.schemas.story import StoryCreate, StoryUpdate
from app.core.exceptions import NotFoundException, ValidationException


class StoryService:
    """Service for story management"""
    
    @staticmethod
    def get_active_stories(
        db: Session,
        user_id: Optional[int] = None,
        city_id: Optional[int] = None,
        partner_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Story]:
        """Get active stories for user"""
        now = datetime.utcnow()
        
        query = db.query(Story).filter(
            Story.is_active == True,
            Story.status == StoryStatus.ACTIVE.value,
            Story.expires_at > now,
            or_(
                Story.scheduled_at == None,
                Story.scheduled_at <= now
            )
        )
        
        # Фильтр по городу
        if city_id:
            query = query.filter(
                or_(
                    Story.city_id == city_id,
                    Story.city_id == None,
                    Story.target_audience == "all"
                )
            )
        
        # Фильтр по партнеру
        if partner_id:
            query = query.filter(
                or_(
                    Story.partner_id == partner_id,
                    Story.partner_id == None
                )
            )
        
        # Исключаем уже просмотренные (опционально)
        if user_id:
            viewed_story_ids = db.query(StoryView.story_id).filter(
                StoryView.user_id == user_id
            ).subquery()
            # Можно добавить фильтр для исключения просмотренных
        
        stories = query.order_by(
            Story.priority.desc(),
            Story.created_at.desc()
        ).limit(limit).all()
        
        return stories
    
    @staticmethod
    def create_story(
        db: Session,
        story_data: StoryCreate,
        created_by: int
    ) -> Story:
        """Create a new story"""
        # Валидация даты истечения
        if story_data.expires_at <= datetime.utcnow():
            raise ValidationException("Дата истечения должна быть в будущем")
        
        # Валидация запланированной даты
        if story_data.scheduled_at and story_data.scheduled_at <= datetime.utcnow():
            raise ValidationException("Запланированная дата должна быть в будущем")
        
        # Автоматическое определение статуса
        status = StoryStatus.DRAFT.value
        if story_data.scheduled_at:
            status = StoryStatus.SCHEDULED.value
        elif story_data.expires_at > datetime.utcnow():
            status = StoryStatus.ACTIVE.value
        
        story = Story(
            **story_data.dict(),
            created_by=created_by,
            status=status
        )
        
        db.add(story)
        db.commit()
        db.refresh(story)
        
        return story
    
    @staticmethod
    def update_story(
        db: Session,
        story_id: int,
        story_data: StoryUpdate
    ) -> Story:
        """Update story"""
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            raise NotFoundException("Сторис не найден")
        
        update_data = story_data.dict(exclude_unset=True)
        
        # Обновление статуса при изменении дат
        if 'expires_at' in update_data or 'scheduled_at' in update_data:
            now = datetime.utcnow()
            expires_at = update_data.get('expires_at', story.expires_at)
            scheduled_at = update_data.get('scheduled_at', story.scheduled_at)
            
            if expires_at and expires_at <= now:
                update_data['status'] = StoryStatus.EXPIRED.value
            elif scheduled_at and scheduled_at > now:
                update_data['status'] = StoryStatus.SCHEDULED.value
            elif expires_at and expires_at > now:
                update_data['status'] = StoryStatus.ACTIVE.value
        
        for field, value in update_data.items():
            setattr(story, field, value)
        
        db.commit()
        db.refresh(story)
        
        return story
    
    @staticmethod
    def record_view(
        db: Session,
        story_id: int,
        user_id: int
    ) -> bool:
        """Record story view"""
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            return False
        
        # Проверяем, не просматривал ли уже пользователь
        existing_view = db.query(StoryView).filter(
            StoryView.story_id == story_id,
            StoryView.user_id == user_id
        ).first()
        
        if not existing_view:
            # Создаем новую запись просмотра
            view = StoryView(
                story_id=story_id,
                user_id=user_id
            )
            db.add(view)
            
            # Увеличиваем счетчик просмотров
            story.views_count += 1
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def record_click(
        db: Session,
        story_id: int,
        user_id: int,
        action_type: Optional[str] = None
    ) -> bool:
        """Record story click"""
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            return False
        
        # Создаем запись клика
        click = StoryClick(
            story_id=story_id,
            user_id=user_id,
            action_type=action_type or story.action_type
        )
        db.add(click)
        
        # Увеличиваем счетчик кликов
        story.clicks_count += 1
        db.commit()
        
        return True
    
    @staticmethod
    def cleanup_expired_stories(db: Session) -> int:
        """Cleanup expired stories"""
        now = datetime.utcnow()
        
        expired_stories = db.query(Story).filter(
            Story.expires_at < now,
            Story.is_active == True,
            Story.auto_delete == True
        ).all()
        
        count = len(expired_stories)
        
        for story in expired_stories:
            story.is_active = False
            story.status = StoryStatus.EXPIRED.value
        
        db.commit()
        
        return count
    
    @staticmethod
    def activate_scheduled_stories(db: Session) -> int:
        """Activate scheduled stories"""
        now = datetime.utcnow()
        
        scheduled_stories = db.query(Story).filter(
            Story.status == StoryStatus.SCHEDULED.value,
            Story.scheduled_at <= now,
            Story.expires_at > now
        ).all()
        
        count = len(scheduled_stories)
        
        for story in scheduled_stories:
            story.status = StoryStatus.ACTIVE.value
        
        db.commit()
        
        return count

