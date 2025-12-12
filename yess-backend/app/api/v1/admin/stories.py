"""Admin API endpoints for stories management"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.story import Story, StoryStatus
from app.models.user import User
from app.schemas.story import (
    StoryCreate,
    StoryUpdate,
    StoryResponse,
    StoryListResponse,
    StoryStatsResponse
)
from app.services.dependencies import get_current_user
from app.services.story_service import StoryService
from app.core.exceptions import NotFoundException, ValidationException

router = APIRouter(prefix="/admin/stories", tags=["Admin Stories"])


@router.get("", response_model=StoryListResponse)
async def get_stories(
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    partner_id: Optional[int] = Query(None, description="Фильтр по партнеру"),
    city_id: Optional[int] = Query(None, description="Фильтр по городу"),
    is_active: Optional[bool] = Query(None, description="Фильтр по активности"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список всех сторисов (для админа)"""
    # Проверка прав (только админ)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    query = db.query(Story)
    
    # Фильтры
    if status:
        query = query.filter(Story.status == status)
    if partner_id:
        query = query.filter(Story.partner_id == partner_id)
    if city_id:
        query = query.filter(Story.city_id == city_id)
    if is_active is not None:
        query = query.filter(Story.is_active == is_active)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    stories = query.order_by(
        Story.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    # Формируем ответы
    items = []
    for story in stories:
        story_dict = StoryResponse.model_validate(story).dict()
        if story.partner:
            story_dict['partner_name'] = story.partner.name
        if story.promotion:
            story_dict['promotion_title'] = story.promotion.title
        if story.city:
            story_dict['city_name'] = story.city.name
        items.append(StoryResponse(**story_dict))
    
    return StoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить детали сториса"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Сторис не найден")
    
    story_dict = StoryResponse.model_validate(story).dict()
    if story.partner:
        story_dict['partner_name'] = story.partner.name
    if story.promotion:
        story_dict['promotion_title'] = story.promotion.title
    if story.city:
        story_dict['city_name'] = story.city.name
    
    return StoryResponse(**story_dict)


@router.post("", response_model=StoryResponse, status_code=201)
async def create_story(
    story_data: StoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать новый сторис"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    try:
        story = StoryService.create_story(
            db=db,
            story_data=story_data,
            created_by=current_user.id
        )
        
        story_dict = StoryResponse.model_validate(story).dict()
        if story.partner:
            story_dict['partner_name'] = story.partner.name
        if story.promotion:
            story_dict['promotion_title'] = story.promotion.title
        if story.city:
            story_dict['city_name'] = story.city.name
        
        return StoryResponse(**story_dict)
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания сториса: {str(e)}")


@router.put("/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: int,
    story_data: StoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить сторис"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    try:
        story = StoryService.update_story(
            db=db,
            story_id=story_id,
            story_data=story_data
        )
        
        story_dict = StoryResponse.model_validate(story).dict()
        if story.partner:
            story_dict['partner_name'] = story.partner.name
        if story.promotion:
            story_dict['promotion_title'] = story.promotion.title
        if story.city:
            story_dict['city_name'] = story.city.name
        
        return StoryResponse(**story_dict)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обновления: {str(e)}")


@router.delete("/{story_id}", status_code=204)
async def delete_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить сторис"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Сторис не найден")
    
    db.delete(story)
    db.commit()
    
    return None


@router.post("/{story_id}/publish")
async def publish_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Опубликовать сторис"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Сторис не найден")
    
    now = datetime.utcnow()
    if story.expires_at <= now:
        raise HTTPException(status_code=400, detail="Сторис уже истек")
    
    story.status = StoryStatus.ACTIVE.value
    story.is_active = True
    
    if story.scheduled_at and story.scheduled_at > now:
        story.scheduled_at = now
    
    db.commit()
    db.refresh(story)
    
    return {"success": True, "message": "Сторис опубликован"}


@router.post("/{story_id}/archive")
async def archive_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Архивировать сторис"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Сторис не найден")
    
    story.status = StoryStatus.ARCHIVED.value
    story.is_active = False
    
    db.commit()
    
    return {"success": True, "message": "Сторис архивирован"}


@router.get("/{story_id}/stats", response_model=StoryStatsResponse)
async def get_story_stats(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику сториса"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Сторис не найден")
    
    from app.models.story import StoryView, StoryClick
    
    # Уникальные просмотры
    unique_views = db.query(StoryView).filter(
        StoryView.story_id == story_id
    ).count()
    
    # Процент кликов
    click_rate = 0.0
    if story.views_count > 0:
        click_rate = (story.clicks_count / story.views_count) * 100
    
    # Последние просмотры
    recent_views = db.query(StoryView).filter(
        StoryView.story_id == story_id
    ).order_by(StoryView.viewed_at.desc()).limit(10).all()
    
    # Последние клики
    recent_clicks = db.query(StoryClick).filter(
        StoryClick.story_id == story_id
    ).order_by(StoryClick.clicked_at.desc()).limit(10).all()
    
    return StoryStatsResponse(
        story_id=story_id,
        views_count=story.views_count,
        clicks_count=story.clicks_count,
        shares_count=story.shares_count,
        unique_views=unique_views,
        click_rate=round(click_rate, 2),
        recent_views=[
            {
                "user_id": v.user_id,
                "viewed_at": v.viewed_at.isoformat()
            }
            for v in recent_views
        ],
        recent_clicks=[
            {
                "user_id": c.user_id,
                "clicked_at": c.clicked_at.isoformat(),
                "action_type": c.action_type
            }
            for c in recent_clicks
        ]
    )

