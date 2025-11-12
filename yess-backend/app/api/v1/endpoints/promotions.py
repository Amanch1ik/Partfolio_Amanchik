"""
Полная система акций и промо-кодов для Bonus APP
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime, timedelta
import logging
from enum import Enum
import secrets
import string

from app.core.database import get_db
from app.models.user import User
from app.models.partner import Partner
from app.models.promotion import (
    Promotion, PromoCode, UserPromoCode, PromotionCategory,
    PromotionType, PromoCodeType, PromoCodeStatus
)
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/promotions", tags=["promotions"])

class PromotionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PromoCodeStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    USED = "used"
    CANCELLED = "cancelled"

# Schemas
class PromotionCreate(BaseModel):
    title: str
    description: str
    category: PromotionCategory
    promotion_type: PromotionType
    partner_id: Optional[int] = None
    
    # Условия акции
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    
    # Ограничения
    usage_limit: Optional[int] = None
    usage_limit_per_user: Optional[int] = 1
    
    # Временные рамки
    start_date: datetime
    end_date: datetime
    
    # Дополнительные условия
    conditions: Optional[Dict[str, Any]] = None
    
    @validator('discount_percent')
    def validate_discount_percent(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Discount percent must be between 0 and 100')
        return v
    
    @validator('discount_amount')
    def validate_discount_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError('Discount amount must be positive')
        return v
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class PromotionResponse(BaseModel):
    id: int
    title: str
    description: str
    category: PromotionCategory
    promotion_type: PromotionType
    partner_id: Optional[int]
    partner_name: Optional[str]
    
    # Условия акции
    discount_percent: Optional[float]
    discount_amount: Optional[float]
    min_order_amount: Optional[float]
    max_discount_amount: Optional[float]
    
    # Ограничения
    usage_limit: Optional[int]
    usage_limit_per_user: Optional[int]
    usage_count: int
    
    # Временные рамки
    start_date: datetime
    end_date: datetime
    status: PromotionStatus
    
    # Дополнительные условия
    conditions: Optional[Dict[str, Any]]
    
    # Метаданные
    created_at: datetime
    updated_at: Optional[datetime]

class PromoCodeCreate(BaseModel):
    code: str
    promotion_id: int
    promo_type: PromoCodeType
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    usage_limit_per_user: Optional[int] = 1
    start_date: datetime
    end_date: datetime
    conditions: Optional[Dict[str, Any]] = None

class PromoCodeResponse(BaseModel):
    id: int
    code: str
    promotion_id: int
    promotion_title: str
    promo_type: PromoCodeType
    discount_percent: Optional[float]
    discount_amount: Optional[float]
    usage_limit: Optional[int]
    usage_limit_per_user: Optional[int]
    usage_count: int
    start_date: datetime
    end_date: datetime
    status: PromoCodeStatus
    conditions: Optional[Dict[str, Any]]
    created_at: datetime

class PromoCodeValidationRequest(BaseModel):
    code: str
    user_id: int
    order_amount: float
    partner_id: Optional[int] = None

class PromoCodeValidationResponse(BaseModel):
    is_valid: bool
    discount_amount: float
    final_amount: float
    message: str
    promo_code: Optional[PromoCodeResponse] = None

# Services
class PromotionService:
    """Сервис для работы с акциями и промо-кодами"""
    
    def __init__(self):
        pass
    
    def generate_promo_code(self, length: int = 8) -> str:
        """Генерация промо-кода"""
        characters = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    async def create_promotion(
        self,
        promotion_data: PromotionCreate,
        db: Session
    ) -> Promotion:
        """Создание акции"""
        
        # Проверяем партнера, если указан
        if promotion_data.partner_id:
            partner = db.query(Partner).filter(Partner.id == promotion_data.partner_id).first()
            if not partner:
                raise HTTPException(status_code=404, detail="Partner not found")
        
        # Создаем акцию
        promotion = Promotion(
            title=promotion_data.title,
            description=promotion_data.description,
            category=promotion_data.category,
            promotion_type=promotion_data.promotion_type,
            partner_id=promotion_data.partner_id,
            discount_percent=promotion_data.discount_percent,
            discount_amount=promotion_data.discount_amount,
            min_order_amount=promotion_data.min_order_amount,
            max_discount_amount=promotion_data.max_discount_amount,
            usage_limit=promotion_data.usage_limit,
            usage_limit_per_user=promotion_data.usage_limit_per_user,
            start_date=promotion_data.start_date,
            end_date=promotion_data.end_date,
            conditions=promotion_data.conditions,
            status=PromotionStatus.DRAFT
        )
        
        db.add(promotion)
        db.commit()
        db.refresh(promotion)
        
        return promotion
    
    async def create_promo_code(
        self,
        promo_data: PromoCodeCreate,
        db: Session
    ) -> PromoCode:
        """Создание промо-кода"""
        
        # Проверяем существование акции
        promotion = db.query(Promotion).filter(Promotion.id == promo_data.promotion_id).first()
        if not promotion:
            raise HTTPException(status_code=404, detail="Promotion not found")
        
        # Проверяем уникальность кода
        existing_code = db.query(PromoCode).filter(PromoCode.code == promo_data.code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="Promo code already exists")
        
        # Создаем промо-код
        promo_code = PromoCode(
            code=promo_data.code,
            promotion_id=promo_data.promotion_id,
            promo_type=promo_data.promo_type,
            discount_percent=promo_data.discount_percent,
            discount_amount=promo_data.discount_amount,
            usage_limit=promo_data.usage_limit,
            usage_limit_per_user=promo_data.usage_limit_per_user,
            start_date=promo_data.start_date,
            end_date=promo_data.end_date,
            conditions=promo_data.conditions,
            status=PromoCodeStatus.ACTIVE
        )
        
        db.add(promo_code)
        db.commit()
        db.refresh(promo_code)
        
        return promo_code
    
    async def validate_promo_code(
        self,
        validation_data: PromoCodeValidationRequest,
        db: Session
    ) -> PromoCodeValidationResponse:
        """Валидация промо-кода"""
        
        # Ищем промо-код
        promo_code = db.query(PromoCode).filter(PromoCode.code == validation_data.code).first()
        
        if not promo_code:
            return PromoCodeValidationResponse(
                is_valid=False,
                discount_amount=0,
                final_amount=validation_data.order_amount,
                message="Промо-код не найден"
            )
        
        # Проверяем статус
        if promo_code.status != PromoCodeStatus.ACTIVE:
            return PromoCodeValidationResponse(
                is_valid=False,
                discount_amount=0,
                final_amount=validation_data.order_amount,
                message="Промо-код неактивен"
            )
        
        # Проверяем временные рамки
        now = datetime.utcnow()
        if now < promo_code.start_date or now > promo_code.end_date:
            return PromoCodeValidationResponse(
                is_valid=False,
                discount_amount=0,
                final_amount=validation_data.order_amount,
                message="Промо-код истек"
            )
        
        # Проверяем лимит использования
        if promo_code.usage_limit:
            if promo_code.usage_count >= promo_code.usage_limit:
                return PromoCodeValidationResponse(
                    is_valid=False,
                    discount_amount=0,
                    final_amount=validation_data.order_amount,
                    message="Промо-код исчерпан"
                )
        
        # Проверяем лимит использования на пользователя
        user_usage_count = db.query(func.count(UserPromoCode.id)).filter(
            UserPromoCode.user_id == validation_data.user_id,
            UserPromoCode.promo_code_id == promo_code.id
        ).scalar()
        
        if user_usage_count >= promo_code.usage_limit_per_user:
            return PromoCodeValidationResponse(
                is_valid=False,
                discount_amount=0,
                final_amount=validation_data.order_amount,
                message="Вы уже использовали этот промо-код"
            )
        
        # Проверяем минимальную сумму заказа
        if promo_code.promotion.min_order_amount:
            if validation_data.order_amount < promo_code.promotion.min_order_amount:
                return PromoCodeValidationResponse(
                    is_valid=False,
                    discount_amount=0,
                    final_amount=validation_data.order_amount,
                    message=f"Минимальная сумма заказа: {promo_code.promotion.min_order_amount} сом"
                )
        
        # Рассчитываем скидку
        discount_amount = 0
        
        if promo_code.discount_percent:
            discount_amount = validation_data.order_amount * (promo_code.discount_percent / 100)
        elif promo_code.discount_amount:
            discount_amount = promo_code.discount_amount
        
        # Применяем максимальную скидку
        if promo_code.promotion.max_discount_amount:
            discount_amount = min(discount_amount, promo_code.promotion.max_discount_amount)
        
        # Скидка не может быть больше суммы заказа
        discount_amount = min(discount_amount, validation_data.order_amount)
        
        final_amount = validation_data.order_amount - discount_amount
        
        return PromoCodeValidationResponse(
            is_valid=True,
            discount_amount=discount_amount,
            final_amount=final_amount,
            message="Промо-код применен успешно",
            promo_code=PromoCodeResponse.from_orm(promo_code)
        )
    
    async def use_promo_code(
        self,
        promo_code_id: int,
        user_id: int,
        order_id: int,
        discount_amount: float,
        db: Session
    ) -> UserPromoCode:
        """Использование промо-кода"""
        
        # Создаем запись об использовании
        user_promo_code = UserPromoCode(
            user_id=user_id,
            promo_code_id=promo_code_id,
            order_id=order_id,
            discount_amount=discount_amount,
            used_at=datetime.utcnow()
        )
        
        db.add(user_promo_code)
        
        # Увеличиваем счетчик использования
        promo_code = db.query(PromoCode).filter(PromoCode.id == promo_code_id).first()
        if promo_code:
            promo_code.usage_count += 1
            
            # Проверяем, не исчерпан ли лимит
            if promo_code.usage_limit and promo_code.usage_count >= promo_code.usage_limit:
                promo_code.status = PromoCodeStatus.USED
        
        db.commit()
        db.refresh(user_promo_code)
        
        return user_promo_code

# Инициализация сервиса
promotion_service = PromotionService()

# API Endpoints
@router.post("/", response_model=PromotionResponse)
async def create_promotion(
    promotion_data: PromotionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание акции"""
    
    promotion = await promotion_service.create_promotion(
        promotion_data=promotion_data,
        db=db
    )
    
    return PromotionResponse.from_orm(promotion)

@router.get("/", response_model=List[PromotionResponse])
async def get_promotions(
    category: Optional[PromotionCategory] = None,
    partner_id: Optional[int] = None,
    status: Optional[PromotionStatus] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Получение списка акций"""
    
    query = db.query(Promotion)
    
    if category:
        query = query.filter(Promotion.category == category)
    
    if partner_id:
        query = query.filter(Promotion.partner_id == partner_id)
    
    if status:
        query = query.filter(Promotion.status == status)
    
    if active_only:
        now = datetime.utcnow()
        query = query.filter(
            Promotion.status == PromotionStatus.ACTIVE,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    
    promotions = query.order_by(desc(Promotion.created_at)).all()
    
    return [PromotionResponse.from_orm(promotion) for promotion in promotions]

@router.get("/{promotion_id}", response_model=PromotionResponse)
async def get_promotion(
    promotion_id: int,
    db: Session = Depends(get_db)
):
    """Получение акции по ID"""
    
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return PromotionResponse.from_orm(promotion)

@router.post("/promo-codes", response_model=PromoCodeResponse)
async def create_promo_code(
    promo_data: PromoCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание промо-кода"""
    
    promo_code = await promotion_service.create_promo_code(
        promo_data=promo_data,
        db=db
    )
    
    return PromoCodeResponse.from_orm(promo_code)

@router.post("/promo-codes/generate")
async def generate_promo_code(
    promotion_id: int,
    count: int = 1,
    length: int = 8,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Генерация промо-кодов"""
    
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    generated_codes = []
    
    for _ in range(count):
        # Генерируем уникальный код
        while True:
            code = promotion_service.generate_promo_code(length)
            existing = db.query(PromoCode).filter(PromoCode.code == code).first()
            if not existing:
                break
        
        # Создаем промо-код
        promo_code = PromoCode(
            code=code,
            promotion_id=promotion_id,
            promo_type=PromoCodeType.PERCENTAGE,
            discount_percent=promotion.discount_percent,
            discount_amount=promotion.discount_amount,
            usage_limit=promotion.usage_limit,
            usage_limit_per_user=promotion.usage_limit_per_user,
            start_date=promotion.start_date,
            end_date=promotion.end_date,
            status=PromoCodeStatus.ACTIVE
        )
        
        db.add(promo_code)
        generated_codes.append(code)
    
    db.commit()
    
    return {
        "message": f"Generated {count} promo codes",
        "codes": generated_codes
    }

@router.post("/promo-codes/validate", response_model=PromoCodeValidationResponse)
async def validate_promo_code(
    validation_data: PromoCodeValidationRequest,
    db: Session = Depends(get_db)
):
    """Валидация промо-кода"""
    
    result = await promotion_service.validate_promo_code(
        validation_data=validation_data,
        db=db
    )
    
    return result

@router.get("/promo-codes/{code}")
async def get_promo_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Получение информации о промо-коде"""
    
    promo_code = db.query(PromoCode).filter(PromoCode.code == code).first()
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    return PromoCodeResponse.from_orm(promo_code)

@router.get("/user/{user_id}/promo-codes")
async def get_user_promo_codes(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Получение промо-кодов пользователя"""
    
    user_promo_codes = db.query(UserPromoCode).filter(
        UserPromoCode.user_id == user_id
    ).order_by(desc(UserPromoCode.used_at)).all()
    
    return [
        {
            "id": upc.id,
            "promo_code": PromoCodeResponse.from_orm(upc.promo_code),
            "discount_amount": upc.discount_amount,
            "used_at": upc.used_at,
            "order_id": upc.order_id
        }
        for upc in user_promo_codes
    ]

@router.patch("/{promotion_id}/status")
async def update_promotion_status(
    promotion_id: int,
    status: PromotionStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление статуса акции"""
    
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promotion.status = status
    promotion.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"Promotion status updated to {status}"}

@router.get("/stats")
async def get_promotion_stats(
    db: Session = Depends(get_db)
):
    """Статистика акций и промо-кодов"""
    
    # Статистика акций
    total_promotions = db.query(func.count(Promotion.id)).scalar()
    active_promotions = db.query(func.count(Promotion.id)).filter(
        Promotion.status == PromotionStatus.ACTIVE
    ).scalar()
    
    # Статистика промо-кодов
    total_promo_codes = db.query(func.count(PromoCode.id)).scalar()
    active_promo_codes = db.query(func.count(PromoCode.id)).filter(
        PromoCode.status == PromoCodeStatus.ACTIVE
    ).scalar()
    used_promo_codes = db.query(func.count(PromoCode.id)).filter(
        PromoCode.status == PromoCodeStatus.USED
    ).scalar()
    
    # Статистика по категориям
    category_stats = {}
    for category in PromotionCategory:
        count = db.query(func.count(Promotion.id)).filter(
            Promotion.category == category
        ).scalar()
        category_stats[category.value] = count
    
    return {
        "promotions": {
            "total": total_promotions,
            "active": active_promotions
        },
        "promo_codes": {
            "total": total_promo_codes,
            "active": active_promo_codes,
            "used": used_promo_codes
        },
        "by_category": category_stats
    }
