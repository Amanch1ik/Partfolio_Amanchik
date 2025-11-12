"""API endpoints for order payments"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.payment import OrderPaymentRequest, PaymentResponse, PaymentMethod, PaymentStatus
from app.services.dependencies import get_current_user
from app.services.unified_payment_gateway import UnifiedPaymentGateway, PaymentMethod as GatewayPaymentMethod, PaymentStatus as GatewayPaymentStatus
from app.core.exceptions import NotFoundException, ValidationException

router = APIRouter(prefix="/orders/{order_id}/payment", tags=["Order Payments"])


@router.post("", response_model=PaymentResponse)
async def create_order_payment(
    order_id: int,
    payment_request: OrderPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать платеж для заказа"""
    # Получение заказа
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Заказ уже оплачен или отменен")
    
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Заказ уже оплачен")
    
    # Преобразование метода оплаты
    try:
        gateway_method = GatewayPaymentMethod(payment_request.method.value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неподдерживаемый метод оплаты")
    
    # Создание платежа через универсальный шлюз
    gateway = UnifiedPaymentGateway()
    
    try:
        # Обработка платежа
        payment_result = await gateway.process_payment(
            user_id=current_user.id,
            amount=float(order.final_amount),
            method=gateway_method,
            db=db,
            order_id=order_id,
            description=f"Оплата заказа #{order_id}"
        )
        
        # Обновление заказа
        order.payment_method = payment_request.method.value
        order.payment_status = "processing"
        db.commit()
        
        # Формирование ответа
        return PaymentResponse(
            payment_id=None,
            transaction_id=payment_result.get("transaction_id"),
            order_id=order_id,
            status=payment_result.get("status", "processing"),
            amount=float(order.final_amount),
            commission=payment_result.get("commission", 0.0),
            redirect_url=payment_result.get("redirect_url"),
            payment_url=payment_result.get("redirect_url"),
            qr_code=payment_result.get("qr_code"),
            message=payment_result.get("message", "Платеж создан")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания платежа: {str(e)}")


@router.get("/status")
async def get_payment_status(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статус оплаты заказа"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    return {
        "order_id": order_id,
        "payment_status": order.payment_status,
        "order_status": order.status.value,
        "amount": float(order.final_amount),
        "paid_at": order.paid_at.isoformat() if order.paid_at else None
    }

