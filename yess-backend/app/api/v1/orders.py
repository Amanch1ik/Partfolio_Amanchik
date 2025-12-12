"""API endpoints for orders"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import (
    OrderCreateRequest,
    OrderResponse,
    OrderCalculateRequest,
    OrderCalculateResponse,
    OrderConfirmRequest,
    OrderConfirmResponse
)
from app.services.dependencies import get_current_user
from app.services.order_service import OrderService
from app.core.exceptions import NotFoundException, ValidationException

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/calculate", response_model=OrderCalculateResponse)
async def calculate_order(
    request: OrderCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Рассчитать стоимость заказа"""
    try:
        calculation = OrderService.calculate_order(
            db=db,
            partner_id=request.partner_id,
            items=request.items,
            user_id=current_user.id
        )
        
        return OrderCalculateResponse(
            order_total=calculation["order_total"],
            discount=calculation["discount"],
            cashback_amount=calculation["cashback_amount"],
            final_amount=calculation["final_amount"],
            max_discount=calculation["max_discount"],
            user_balance=calculation["user_balance"]
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    request: OrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать новый заказ"""
    try:
        # Генерация idempotency key если не указан
        if not request.idempotency_key:
            request.idempotency_key = OrderService.generate_idempotency_key(
                current_user.id,
                request.partner_id,
                request.items
            )
        
        order = OrderService.create_order(
            db=db,
            user_id=current_user.id,
            order_request=request
        )
        
        # Загружаем связанные данные
        db.refresh(order)
        order.items  # Загружаем items
        
        return OrderResponse.model_validate(order)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о заказе"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    return OrderResponse.model_validate(order)


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20
):
    """Получить список заказов пользователя"""
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).limit(limit).all()
    
    return [OrderResponse.model_validate(order) for order in orders]

