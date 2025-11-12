from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.unified_api_service import unified_api_service
from app.schemas.unified import (
    UserResponse, 
    PartnerResponse, 
    TransactionResponse, 
    WalletResponse, 
    NotificationResponse,
    RouteResponse,
    RecommendationResponse,
    ErrorResponse
)

router = APIRouter(prefix="/unified", tags=["Unified API"])

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение профиля текущего пользователя
    """
    return unified_api_service.get_user_profile(db, current_user.id)

@router.get("/partners", response_model=List[PartnerResponse])
async def get_partners(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение списка партнеров с фильтрацией
    """
    return unified_api_service.get_partners(
        db, 
        page=page, 
        page_size=page_size, 
        category=category
    )

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение истории транзакций пользователя
    """
    return unified_api_service.get_transactions(
        db, 
        user_id=current_user.id, 
        page=page, 
        page_size=page_size
    )

@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации о кошельке пользователя
    """
    return unified_api_service.get_wallet(db, current_user.id)

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение уведомлений пользователя
    """
    return unified_api_service.get_notifications(
        db, 
        user_id=current_user.id, 
        page=page, 
        page_size=page_size
    )

@router.get("/recommendations", response_model=RecommendationResponse)
async def get_partner_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение персонализированных рекомендаций партнеров
    """
    return unified_api_service.get_partner_recommendations(
        db, 
        user_id=current_user.id
    )

@router.post("/route", response_model=RouteResponse)
async def calculate_route(
    partner_location_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Построение маршрута между партнерами
    """
    return unified_api_service.calculate_route(
        db, 
        partner_location_ids=partner_location_ids
    )

@router.get("/error-example", response_model=ErrorResponse)
async def error_example():
    """
    Пример обработки ошибок
    """
    raise HTTPException(
        status_code=400, 
        detail="Пример обработки ошибки"
    )
