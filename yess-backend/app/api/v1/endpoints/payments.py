"""
API эндпоинты для платежной системы Bonus APP
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.payment import Transaction, Wallet, PaymentMethod as PaymentMethodModel
from ..schemas.payment import (
    PaymentRequest, PaymentResponse, PaymentMethodsResponse, 
    TransactionHistoryResponse, WalletBalance, PaymentStatusResponse,
    RefundRequest, RefundResponse, PaymentAnalytics as PaymentAnalyticsSchema
)
from ..services.unified_payment_gateway import payment_gateway, PaymentMethod, PaymentStatus
from ..services.payment_analytics import PaymentAnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

@router.post("/replenish", response_model=PaymentResponse)
async def replenish_wallet(
    payment_request: PaymentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Пополнение кошелька пользователя
    """
    try:
        # Получение IP адреса и User Agent
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        
        # Обработка платежа через универсальный шлюз
        result = await payment_gateway.process_replenishment(
            user_id=current_user.id,
            amount=payment_request.amount,
            method=PaymentMethod(payment_request.method),
            db=db
        )
        
        # Обновление аналитики
        analytics_service = PaymentAnalyticsService(db)
        await analytics_service.record_transaction(
            user_id=current_user.id,
            amount=payment_request.amount,
            method=payment_request.method,
            status=result.status
        )
        
        logger.info(f"Пополнение кошелька: User {current_user.id}, Amount {payment_request.amount}")
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Ошибка пополнения кошелька: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )

@router.get("/methods", response_model=PaymentMethodsResponse)
async def get_payment_methods():
    """
    Получение доступных методов оплаты
    """
    try:
        methods_info = await payment_gateway.get_payment_methods()
        return PaymentMethodsResponse(**methods_info)
    except Exception as e:
        logger.error(f"Ошибка получения методов оплаты: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения методов оплаты"
        )

@router.get("/balance", response_model=WalletBalance)
async def get_wallet_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение баланса кошелька пользователя
    """
    try:
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        
        if not wallet:
            # Создание кошелька если его нет
            wallet = Wallet(user_id=current_user.id, balance=0.0)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        
        return WalletBalance(
            balance=wallet.balance,
            currency="KGS",
            last_updated=wallet.updated_at or wallet.created_at
        )
        
    except Exception as e:
        logger.error(f"Ошибка получения баланса: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения баланса"
        )

@router.get("/transactions", response_model=TransactionHistoryResponse)
async def get_transaction_history(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение истории транзакций пользователя
    """
    try:
        # Подсчет общего количества транзакций
        total_count = db.query(Transaction).filter(Transaction.user_id == current_user.id).count()
        
        # Получение транзакций с пагинацией
        offset = (page - 1) * page_size
        transactions = db.query(Transaction)\
            .filter(Transaction.user_id == current_user.id)\
            .order_by(Transaction.created_at.desc())\
            .offset(offset)\
            .limit(page_size)\
            .all()
        
        # Преобразование в схему
        transaction_list = []
        for transaction in transactions:
            transaction_list.append({
                "id": transaction.id,
                "amount": transaction.amount,
                "commission": transaction.commission,
                "payment_method": transaction.payment_method,
                "status": transaction.status,
                "created_at": transaction.created_at,
                "processed_at": transaction.processed_at,
                "error_message": transaction.error_message
            })
        
        return TransactionHistoryResponse(
            transactions=transaction_list,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Ошибка получения истории транзакций: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения истории транзакций"
        )

@router.get("/transactions/{transaction_id}/status", response_model=PaymentStatusResponse)
async def get_transaction_status(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Проверка статуса конкретной транзакции
    """
    try:
        transaction = db.query(Transaction)\
            .filter(Transaction.id == transaction_id)\
            .filter(Transaction.user_id == current_user.id)\
            .first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Транзакция не найдена"
            )
        
        return PaymentStatusResponse(
            transaction_id=transaction.id,
            status=transaction.status,
            amount=transaction.amount,
            commission=transaction.commission,
            created_at=transaction.created_at,
            processed_at=transaction.processed_at,
            error_message=transaction.error_message,
            gateway_response=transaction.gateway_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка проверки статуса транзакции: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка проверки статуса транзакции"
        )

@router.post("/refund", response_model=RefundResponse)
async def request_refund(
    refund_request: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Запрос на возврат средств
    """
    try:
        # Проверка существования транзакции
        transaction = db.query(Transaction)\
            .filter(Transaction.id == refund_request.transaction_id)\
            .filter(Transaction.user_id == current_user.id)\
            .first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Транзакция не найдена"
            )
        
        if transaction.status != PaymentStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Возврат возможен только для успешных транзакций"
            )
        
        # Определение суммы возврата
        refund_amount = refund_request.amount or transaction.amount
        
        if refund_amount > transaction.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Сумма возврата не может превышать сумму транзакции"
            )
        
        # Создание запроса на возврат
        from ..models.payment import Refund
        refund = Refund(
            transaction_id=transaction.id,
            user_id=current_user.id,
            amount=refund_amount,
            reason=refund_request.reason,
            status=PaymentStatus.PENDING
        )
        
        db.add(refund)
        db.commit()
        db.refresh(refund)
        
        logger.info(f"Запрос на возврат: User {current_user.id}, Transaction {transaction.id}, Amount {refund_amount}")
        
        return RefundResponse(
            refund_id=refund.id,
            transaction_id=transaction.id,
            amount=refund_amount,
            status=refund.status,
            message="Запрос на возврат создан и будет обработан в течение 24 часов"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания запроса на возврат: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания запроса на возврат"
        )

@router.get("/analytics", response_model=PaymentAnalyticsSchema)
async def get_payment_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение аналитики платежей пользователя
    """
    try:
        analytics_service = PaymentAnalyticsService(db)
        analytics = await analytics_service.get_user_analytics(current_user.id)
        
        return analytics
        
    except Exception as e:
        logger.error(f"Ошибка получения аналитики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения аналитики"
        )

@router.get("/limits")
async def get_payment_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение лимитов платежей пользователя
    """
    try:
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        
        if not wallet:
            wallet = Wallet(user_id=current_user.id)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        
        return {
            "daily_limit": wallet.daily_limit,
            "monthly_limit": wallet.monthly_limit,
            "single_transaction_limit": wallet.single_transaction_limit,
            "used_daily": wallet.daily_used,
            "used_monthly": wallet.monthly_used,
            "last_daily_reset": wallet.last_daily_reset,
            "last_monthly_reset": wallet.last_monthly_reset
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения лимитов: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения лимитов"
        )
