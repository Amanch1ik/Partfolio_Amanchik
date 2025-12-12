"""Webhook endpoints for payment confirmations"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional
import hmac
import hashlib
import json

from app.core.database import get_db
from app.core.config import settings
from app.core.exceptions import NotFoundException, ValidationException
from app.models.transaction import Transaction
from app.models.order import Order, OrderStatus
from app.models.wallet import Wallet
from app.services.cashback_service import CashbackService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Проверка подписи webhook"""
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)


@router.post("/payment/callback")
async def payment_callback(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    db: Session = Depends(get_db)
):
    """Webhook для подтверждения платежа от платежного шлюза"""
    try:
        # Получение тела запроса
        body = await request.body()
        payload = json.loads(body)
        
        # Проверка подписи (если требуется)
        if x_signature:
            secret = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "default_secret")
            if not verify_webhook_signature(body, x_signature, secret):
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Извлечение данных
        transaction_id = payload.get("transaction_id")
        status = payload.get("status")  # "success", "failed", "cancelled"
        amount = payload.get("amount")
        gateway_transaction_id = payload.get("gateway_transaction_id")
        
        if not transaction_id:
            raise HTTPException(status_code=400, detail="Missing transaction_id")
        
        # Поиск транзакции
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Обновление статуса транзакции
        from datetime import datetime as dt
        if status == "success":
            transaction.status = "success"
            transaction.gateway_transaction_id = gateway_transaction_id
            transaction.processed_at = dt.utcnow()
            
            # Если это оплата заказа
            if transaction.order_id:
                order = db.query(Order).filter(Order.id == transaction.order_id).first()
                if order and order.status == OrderStatus.PENDING:
                    order.status = OrderStatus.PAID
                    order.payment_status = "paid"
                    order.paid_at = dt.utcnow()
                    
                    # Начисление кэшбэка
                    cashback_service = CashbackService(db)
                    await cashback_service.calculate_and_add_cashback(
                        user_id=transaction.user_id,
                        order_id=order.id,
                        order_amount=float(order.order_total)
                    )
            
            # Если это пополнение кошелька
            elif transaction.type == "topup":
                wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
                if wallet:
                    wallet.balance += float(amount)
                else:
                    wallet = Wallet(user_id=transaction.user_id, balance=float(amount))
                    db.add(wallet)
        
        elif status == "failed":
            transaction.status = "failed"
            transaction.error_message = payload.get("error_message", "Payment failed")
            transaction.processed_at = dt.utcnow()
        
        elif status == "cancelled":
            transaction.status = "cancelled"
            transaction.processed_at = dt.utcnow()
        
        db.commit()
        
        return {"status": "ok", "message": "Webhook processed"}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")

