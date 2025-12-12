"""
Partner dashboard endpoints
"""
import logging
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_

from app.core.config import settings
from app.core.database import get_db
from app.services.dependencies import get_current_user
from app.models.user import User
from app.models.partner import Partner, PartnerEmployee
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partner", tags=["Partner Dashboard"])


@router.get("/me")
async def get_current_partner(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Получить данные текущего партнера
    
    В режиме разработки возвращает данные пользователя даже без проверки партнера
    """
    try:
        # В режиме разработки просто возвращаем данные пользователя
        if settings.DEVELOPMENT_MODE:
            return {
                "id": current_user.id if hasattr(current_user, 'id') else 1,
                "email": current_user.email if hasattr(current_user, 'email') else "partner@yess.kg",
                "username": current_user.first_name if hasattr(current_user, 'first_name') and current_user.first_name else "Partner",
                "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Partner",
                "first_name": current_user.first_name if hasattr(current_user, 'first_name') else "Partner",
                "last_name": current_user.last_name if hasattr(current_user, 'last_name') else "",
                "phone": current_user.phone if hasattr(current_user, 'phone') else None,
                "role": "partner",
                "avatar_url": None
            }
        
        # В продакшене проверяем, является ли пользователь партнером
        try:
            partner_employee = db.query(PartnerEmployee).filter(
                PartnerEmployee.user_id == current_user.id
            ).first()
            
            if partner_employee:
                partner = db.query(Partner).filter(Partner.id == partner_employee.partner_id).first()
            else:
                partner = db.query(Partner).filter(Partner.owner_id == current_user.id).first()
            
            if not partner:
                raise HTTPException(
                    status_code=403,
                    detail="Пользователь не является партнером"
                )
            
            return {
                "id": current_user.id,
                "email": current_user.email,
                "username": current_user.first_name or "Partner",
                "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Partner",
                "first_name": current_user.first_name or "",
                "last_name": current_user.last_name or "",
                "phone": current_user.phone,
                "role": "partner",
                "avatar_url": None,
                "partner_id": partner.id,
                "partner_name": partner.name
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_current_partner: {str(e)}")
            # В режиме разработки возвращаем моковые данные
            if settings.DEVELOPMENT_MODE:
                return {
                    "id": current_user.id if hasattr(current_user, 'id') else 1,
                    "email": current_user.email if hasattr(current_user, 'email') else "partner@yess.kg",
                    "username": current_user.first_name if hasattr(current_user, 'first_name') and current_user.first_name else "Partner",
                    "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Partner",
                    "role": "partner"
                }
            raise HTTPException(
                status_code=503,
                detail="Ошибка подключения к базе данных"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_partner: {str(e)}", exc_info=True)
        # В режиме разработки возвращаем моковые данные
        if settings.DEVELOPMENT_MODE:
            return {
                "id": 1,
                "email": "partner@yess.kg",
                "username": "Partner",
                "name": "Partner",
                "role": "partner"
            }
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Получить статистику для дашборда партнера
    
    В режиме разработки возвращает моковые данные
    """
    try:
        # В режиме разработки возвращаем моковые данные
        if settings.DEVELOPMENT_MODE:
            return {
                "data": {
                    "total_sales": 10325,
                    "average_check": 750,
                    "total_coins_issued": 6.4,
                    "total_transactions": 1287,
                    "active_promotions": 5,
                    "total_revenue": 128700.0,
                    "sales_growth": 12.0,
                    "check_growth": 8.0,
                    "coins_growth": 24.0
                }
            }
        
        # В продакшене получаем реальные данные из БД
        try:
            # Находим партнера
            partner_employee = db.query(PartnerEmployee).filter(
                PartnerEmployee.user_id == current_user.id
            ).first()
            
            if partner_employee:
                partner = db.query(Partner).filter(Partner.id == partner_employee.partner_id).first()
            else:
                partner = db.query(Partner).filter(Partner.owner_id == current_user.id).first()
            
            if not partner:
                raise HTTPException(
                    status_code=403,
                    detail="Пользователь не является партнером"
                )
            
            # Здесь можно добавить реальные запросы к БД для получения статистики
            # Пока возвращаем моковые данные
            return {
                "data": {
                    "total_sales": 10325,
                    "average_check": 750,
                    "total_coins_issued": 6.4,
                    "total_transactions": 1287,
                    "active_promotions": 5,
                    "total_revenue": 128700.0,
                    "sales_growth": 12.0,
                    "check_growth": 8.0,
                    "coins_growth": 24.0
                }
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_dashboard_stats: {str(e)}")
            # В режиме разработки возвращаем моковые данные даже при ошибке БД
            if settings.DEVELOPMENT_MODE:
                return {
                    "data": {
                        "total_sales": 10325,
                        "average_check": 750,
                        "total_coins_issued": 6.4,
                        "total_transactions": 1287,
                        "active_promotions": 5,
                        "total_revenue": 128700.0,
                        "sales_growth": 12.0,
                        "check_growth": 8.0,
                        "coins_growth": 24.0
                    }
                }
            raise HTTPException(
                status_code=503,
                detail="Ошибка подключения к базе данных"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_dashboard_stats: {str(e)}", exc_info=True)
        # В режиме разработки возвращаем моковые данные
        if settings.DEVELOPMENT_MODE:
            return {
                "data": {
                    "total_sales": 10325,
                    "average_check": 750,
                    "total_coins_issued": 6.4,
                    "total_transactions": 1287,
                    "active_promotions": 5,
                    "total_revenue": 128700.0,
                    "sales_growth": 12.0,
                    "check_growth": 8.0,
                    "coins_growth": 24.0
                }
            }
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )


@router.get("/users/search")
async def search_users(
    search: Optional[str] = Query(None, description="Поисковый запрос"),
    limit: int = Query(20, ge=1, le=100, description="Максимальное количество результатов"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Поиск пользователей по имени, телефону или email
    
    В режиме разработки возвращает моковые данные
    """
    try:
        # В режиме разработки возвращаем моковые данные
        if settings.DEVELOPMENT_MODE:
            # Генерируем моковые данные на основе поискового запроса
            mock_users = [
                {
                    "id": 1,
                    "name": "Иван Иванов",
                    "first_name": "Иван",
                    "last_name": "Иванов",
                    "phone": "+996555123456",
                    "email": "ivan@example.com",
                    "description": "Москва, Россия",
                    "avatar_url": None
                },
                {
                    "id": 2,
                    "name": "Мария Петрова",
                    "first_name": "Мария",
                    "last_name": "Петрова",
                    "phone": "+996555234567",
                    "email": "maria@example.com",
                    "description": "Санкт-Петербург, Россия",
                    "avatar_url": None
                },
                {
                    "id": 3,
                    "name": "Алексей Сидоров",
                    "first_name": "Алексей",
                    "last_name": "Сидоров",
                    "phone": "+996555345678",
                    "email": "alexey@example.com",
                    "description": "Новосибирск, Россия",
                    "avatar_url": None
                },
                {
                    "id": 4,
                    "name": "Елена Козлова",
                    "first_name": "Елена",
                    "last_name": "Козлова",
                    "phone": "+996555456789",
                    "email": "elena@example.com",
                    "description": "Екатеринбург, Россия",
                    "avatar_url": None
                },
                {
                    "id": 5,
                    "name": "Дмитрий Волков",
                    "first_name": "Дмитрий",
                    "last_name": "Волков",
                    "phone": "+996555567890",
                    "email": "dmitry@example.com",
                    "description": "Казань, Россия",
                    "avatar_url": None
                },
            ]
            
            # Если поиск не указан, пустой или равен 'all', возвращаем всех пользователей
            if not search or (isinstance(search, str) and (search.strip() == '' or search.strip() == 'all')):
                return {
                    "data": {
                        "items": mock_users[:limit],
                        "total": len(mock_users),
                        "limit": limit
                    }
                }
            
            # Фильтруем по поисковому запросу
            search_lower = search.lower()
            filtered = [
                u for u in mock_users
                if (search_lower in u["name"].lower() or
                    search_lower in u["phone"].lower() or
                    search_lower in u["email"].lower() or
                    search_lower in u["description"].lower())
            ]
            
            return {
                "data": {
                    "items": filtered[:limit],
                    "total": len(filtered),
                    "limit": limit
                }
            }
        
        # В продакшене ищем в БД
        try:
            # Поиск по имени, телефону или email
            query = db.query(User).filter(
                or_(
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%"),
                    User.phone.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
            ).limit(limit)
            
            users = query.all()
            
            # Форматируем результаты
            results = []
            for user in users:
                full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Пользователь"
                results.append({
                    "id": user.id,
                    "name": full_name,
                    "first_name": user.first_name or "",
                    "last_name": user.last_name or "",
                    "phone": user.phone or "",
                    "email": user.email or "",
                    "description": f"{user.city.name if user.city else 'Не указан'}, {user.referral_code or ''}",
                    "avatar_url": user.avatar_url
                })
            
            return {
                "data": {
                    "items": results,
                    "total": len(results),
                    "limit": limit
                }
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in search_users: {str(e)}")
            # В режиме разработки возвращаем моковые данные даже при ошибке БД
            if settings.DEVELOPMENT_MODE:
                return {
                    "data": {
                        "items": [],
                        "total": 0,
                        "limit": limit
                    }
                }
            raise HTTPException(
                status_code=503,
                detail="Ошибка подключения к базе данных"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in search_users: {str(e)}", exc_info=True)
        # В режиме разработки возвращаем пустой список
        if settings.DEVELOPMENT_MODE:
            return {
                "data": {
                    "items": [],
                    "total": 0,
                    "limit": limit
                }
            }
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )

