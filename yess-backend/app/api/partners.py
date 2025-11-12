from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

from app.core.database import get_db
from app.services.geolocation_service import GeolocationService
from app.schemas.partner import (
    PartnerRecommendation, 
    PartnerSearchRequest,
    PartnerFilterRequest,
    NearbyPartnerRequest
)
from app.services.recommendation_service import RecommendationService
from app.services.auth_service import get_current_user
from app.models.user import User
from app.models.partner import Partner

router = APIRouter(prefix="/partners", tags=["Partners"])

@router.get("/recommendations", response_model=List[PartnerRecommendation])
async def get_personalized_partners(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение персонализированных рекомендаций партнеров
    
    - Анализирует историю транзакций пользователя
    - Предлагает партнеров на основе предпочтений
    - Учитывает категории и сумму предыдущих покупок
    """
    try:
        recommendations = RecommendationService.get_personalized_partners(
            db=db, 
            user=current_user, 
            limit=limit
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trending", response_model=List[PartnerRecommendation])
async def get_trending_partners(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Получение трендовых партнеров
    
    - Возвращает список самых популярных партнеров
    - Основано на количестве транзакций за последний месяц
    """
    try:
        trending_partners = RecommendationService.get_trending_partners(
            db=db, 
            limit=limit
        )
        return trending_partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=List[str])
async def get_partner_categories(
    db: Session = Depends(get_db)
):
    """
    Получение списка уникальных категорий партнеров
    
    - Помогает в фильтрации и навигации
    """
    try:
        categories = db.query(Partner.category).distinct().all()
        return [category[0] for category in categories]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=List[PartnerRecommendation])
async def search_partners(
    search_request: PartnerSearchRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Расширенный поиск партнеров с фильтрацией и сортировкой
    
    Параметры:
    - Текстовый поиск
    - Фильтрация по категориям, кешбэку и другим параметрам
    - Сортировка результатов
    - Постраничная навигация
    """
    try:
        # Базовый запрос на поиск
        base_query = db.query(Partner)
        
        # Текстовый поиск
        if search_request.query:
            base_query = base_query.filter(
                or_(
                    Partner.name.ilike(f"%{search_request.query}%"),
                    Partner.description.ilike(f"%{search_request.query}%")
                )
            )
        
        # Применение фильтров
        if search_request.filter:
            filter_req = search_request.filter
            
            if filter_req.categories:
                base_query = base_query.filter(
                    Partner.category.in_(filter_req.categories)
                )
            
            if filter_req.min_cashback is not None:
                base_query = base_query.filter(
                    Partner.default_cashback_rate >= filter_req.min_cashback
                )
            
            if filter_req.is_verified is not None:
                base_query = base_query.filter(
                    Partner.is_verified == filter_req.is_verified
                )
        
        # Сортировка
        if search_request.sort:
            sort_field = search_request.sort.sort_by
            sort_order = search_request.sort.sort_order
            
            if sort_field == 'cashback':
                base_query = base_query.order_by(
                    Partner.default_cashback_rate.desc() 
                    if sort_order == 'desc' 
                    else Partner.default_cashback_rate.asc()
                )
            elif sort_field == 'name':
                base_query = base_query.order_by(
                    Partner.name.desc() 
                    if sort_order == 'desc' 
                    else Partner.name.asc()
                )
        
        # Постраничная навигация
        partners = base_query.offset(
            (search_request.page - 1) * search_request.page_size
        ).limit(search_request.page_size).all()
        
        # Персонализация для авторизованного пользователя
        if current_user:
            recommendations = [
                PartnerRecommendation(
                    id=partner.id,
                    name=partner.name,
                    category=partner.category,
                    logo_url=partner.logo_url,
                    cashback_rate=RecommendationService._calculate_dynamic_cashback(
                        current_user, partner
                    )
                ) for partner in partners
            ]
        else:
            recommendations = [
                PartnerRecommendation(
                    id=partner.id,
                    name=partner.name,
                    category=partner.category,
                    logo_url=partner.logo_url,
                    cashback_rate=partner.default_cashback_rate
                ) for partner in partners
            ]
        
        return recommendations
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nearby-with-filter", response_model=List[PartnerRecommendation])
async def find_nearby_partners_with_filter(
    nearby_request: NearbyPartnerRequest,
    filter_request: Optional[PartnerFilterRequest] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Поиск ближайших партнеров с расширенной фильтрацией
    
    - Геолокационный поиск
    - Дополнительная фильтрация
    - Персонализация для авторизованных пользователей
    """
    try:
        # Поиск ближайших партнеров с фильтрацией
        nearby_locations = GeolocationService.find_nearby_partners(
            db=db, 
            request=nearby_request,
            filter_request=filter_request
        )
        
        # Персонализация для авторизованного пользователя
        if current_user:
            recommendations = [
                PartnerRecommendation(
                    id=loc.id,
                    name=loc.partner_name,
                    category=loc.partner.category,
                    logo_url=loc.partner.logo_url,
                    cashback_rate=RecommendationService._calculate_dynamic_cashback(
                        current_user, loc.partner
                    )
                ) for loc in nearby_locations
            ]
        else:
            recommendations = [
                PartnerRecommendation(
                    id=loc.id,
                    name=loc.partner_name,
                    category=loc.partner.category,
                    logo_url=loc.partner.logo_url,
                    cashback_rate=loc.max_discount_percent
                ) for loc in nearby_locations
            ]
        
        return recommendations
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
