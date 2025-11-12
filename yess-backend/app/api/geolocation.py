from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.services.geolocation_service import GeolocationService
from app.schemas.partner import (
    PartnerLocationResponse, 
    NearbyPartnerRequest, 
    RouteRequest, 
    RouteResponse,
    LocationUpdateRequest
)
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/geolocation", tags=["Geolocation"])

@router.post("/nearby", response_model=List[PartnerLocationResponse])
async def find_nearby_partners(
    request: NearbyPartnerRequest,
    db: Session = Depends(get_db)
):
    """
    Поиск ближайших партнеров
    
    - Принимает текущие координаты пользователя
    - Возвращает список партнеров в указанном радиусе
    - Сортировка по расстоянию
    """
    try:
        nearby_partners = GeolocationService.find_nearby_partners(
            db=db, 
            request=request
        )
        return nearby_partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/route", response_model=RouteResponse)
async def build_route(
    request: RouteRequest,
    db: Session = Depends(get_db)
):
    """
    Построение маршрута между партнерами
    
    - Принимает список ID локаций партнеров
    - Возвращает детали маршрута
    - Рассчитывает расстояние и примерное время
    """
    try:
        route = GeolocationService.build_route(
            db=db, 
            request=request
        )
        return route
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-location", response_model=PartnerLocationResponse)
async def update_partner_location(
    request: LocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Обновление геолокации партнера
    
    - Доступно только авторизованным пользователям
    - Обновляет координаты основной локации
    - Возвращает обновленную информацию о локации
    """
    try:
        # Проверяем, что пользователь является партнером
        if not current_user.is_partner:
            raise HTTPException(status_code=403, detail="Доступ только для партнеров")
        
        location = GeolocationService.update_partner_location(
            db=db, 
            partner_id=current_user.partner_id,
            latitude=request.latitude,
            longitude=request.longitude
        )
        
        return PartnerLocationResponse(
            id=location.id,
            partner_id=location.partner_id,
            partner_name=location.partner.name,
            address=location.address,
            latitude=location.latitude,
            longitude=location.longitude,
            phone_number=location.phone_number,
            working_hours=location.working_hours,
            max_discount_percent=location.partner.default_cashback_rate
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
