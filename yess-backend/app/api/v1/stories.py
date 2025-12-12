"""API endpoints for stories (public - for mobile app)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.story import Story
from app.models.user import User
from app.schemas.story import StoryResponse, StoryViewRequest, StoryClickRequest
from app.services.dependencies import get_current_user
from app.services.story_service import StoryService
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/stories", tags=["Stories"])


@router.get("", response_model=List[StoryResponse])
async def get_active_stories(
    city_id: Optional[int] = Query(None, description="Фильтр по городу"),
    partner_id: Optional[int] = Query(None, description="Фильтр по партнеру"),
    limit: int = Query(50, ge=1, le=100, description="Лимит результатов"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить активные сторисы для пользователя"""
    try:
        user_id = current_user.id if current_user else None
        
        # Получаем город пользователя, если не указан
        if not city_id and current_user:
            city_id = current_user.city_id
        
        stories = StoryService.get_active_stories(
            db=db,
            user_id=user_id,
            city_id=city_id,
            partner_id=partner_id,
            limit=limit
        )
        
        # Преобразуем в ответы с дополнительной информацией
        result = []
        for story in stories:
            story_dict = StoryResponse.model_validate(story).dict()
            
            # Добавляем информацию о партнере
            if story.partner:
                story_dict['partner_name'] = story.partner.name
            
            # Добавляем информацию об акции
            if story.promotion:
                story_dict['promotion_title'] = story.promotion.title
            
            # Добавляем информацию о городе
            if story.city:
                story_dict['city_name'] = story.city.name
            
            result.append(StoryResponse(**story_dict))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения сторисов: {str(e)}")


@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: int,
    db: Session = Depends(get_db)
):
    """Получить детали сториса"""
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


@router.post("/{story_id}/view")
async def record_story_view(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Зафиксировать просмотр сториса"""
    try:
        StoryService.record_view(db=db, story_id=story_id, user_id=current_user.id)
        return {"success": True, "message": "Просмотр зафиксирован"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@router.post("/{story_id}/click")
async def record_story_click(
    story_id: int,
    request: StoryClickRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Зафиксировать клик по сторису"""
    try:
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Сторис не найден")
        
        StoryService.record_click(
            db=db,
            story_id=story_id,
            user_id=current_user.id,
            action_type=request.action_type
        )
        
        # Возвращаем информацию о действии
        return {
            "success": True,
            "action_type": story.action_type,
            "action_value": story.action_value
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

