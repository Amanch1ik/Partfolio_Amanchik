"""
QR Code API
Эндпоинты для сканирования и оплаты через QR коды
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User
from app.models.partner import Partner
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.api.v1.auth import get_current_user
from app.services.qr_service import qr_service
from app.core.notifications import sms_service, push_service
from app.core.cache import redis_cache
from app.schemas.qr import QRPaymentRequest, QRPaymentResponse
from app.services.transaction_notification_service import transaction_notification_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/qr", tags=["QR Codes"])


# Schemas
class QRScanRequest(BaseModel):
    qr_data: str


class QRScanResponse(BaseModel):
    partner_id: int
    partner_name: str
    partner_category: str
    partner_logo: Optional[str]
    max_discount: float
    cashback_rate: float
    user_balance: float
    message: str


@router.post("/scan", response_model=QRScanResponse)
async def scan_qr_code(
    request: QRScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Сканирование QR кода партнёра
    Возвращает информацию о партнёре и доступные скидки
    """
    # Парсим QR код
    qr_data = await qr_service.parse_qr_data(request.qr_data)
    
    # Получаем партнёра
    partner = db.query(Partner).filter(
        Partner.id == qr_data["partner_id"],
        Partner.is_active == True
    ).first()
    
    if not partner:
        raise HTTPException(
            status_code=404,
            detail="Partner not found or inactive"
        )
    
    # Получаем баланс пользователя
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Валидируем QR для оплаты
    await qr_service.validate_qr_for_payment(
        partner_id=partner.id,
        user_balance=float(wallet.yescoin_balance),
        min_amount=1.0
    )
    
    return QRScanResponse(
        partner_id=partner.id,
        partner_name=partner.name,
        partner_category=partner.category or "Разное",
        partner_logo=partner.logo_url,
        max_discount=float(partner.max_discount_percent),
        cashback_rate=float(partner.cashback_rate),
        user_balance=float(wallet.yescoin_balance),
        message=f"Отсканирован QR код партнёра: {partner.name}"
    )


@router.post("/pay", response_model=QRPaymentResponse)
async def pay_with_qr(
    request: QRPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Оплата через QR код
    
    Логика:
    1. Проверка баланса
    2. Применение скидки партнёра
    3. Списание YesCoin
    4. Начисление кэшбэка
    5. Создание транзакции
    6. Отправка уведомлений
    """
    # Валидация суммы
    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than 0"
        )
    
    # Получаем партнёра
    partner = db.query(Partner).filter(
        Partner.id == request.partner_id,
        Partner.is_active == True
    ).first()
    
    if not partner:
        raise HTTPException(
            status_code=404,
            detail="Partner not found or inactive"
        )
    
    # Получаем кошелёк
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Рассчитываем скидку
    discount_percent = float(partner.max_discount_percent)
    discount_amount = request.amount * (discount_percent / 100)
    
    # Итоговая сумма к списанию
    final_amount = request.amount - discount_amount
    
    # Проверка баланса
    if wallet.yescoin_balance < final_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: {final_amount} YesCoin, Available: {wallet.yescoin_balance}"
        )
    
    # Списываем баллы
    wallet.yescoin_balance -= final_amount
    
    # Рассчитываем и начисляем кэшбэк
    cashback_percent = float(partner.cashback_rate)
    cashback_amount = final_amount * (cashback_percent / 100)
    wallet.yescoin_balance += cashback_amount
    
    # Создаём транзакцию
    transaction = Transaction(
        user_id=current_user.id,
        partner_id=partner.id,
        amount=request.amount,
        yescoin_used=final_amount,
        yescoin_earned=cashback_amount,
        type="payment",
        description=f"Оплата в {partner.name}"
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Инвалидируем кэш
    await redis_cache.invalidate_user_cache(current_user.id)
    
    # Отправляем уведомления через новый сервис
    await transaction_notification_service.notify_transaction(
        user=current_user,
        transaction=transaction,
        partner=partner,
        db=db
    )
    
    logger.info(
        f"Payment completed: User {current_user.id} paid {final_amount} YesCoin "
        f"to Partner {partner.id}, earned {cashback_amount} cashback"
    )
    
    return QRPaymentResponse(
        success=True,
        transaction_id=transaction.id,
        amount_charged=final_amount,
        discount_applied=discount_amount,
        cashback_earned=cashback_amount,
        new_balance=float(wallet.yescoin_balance),
        partner_name=partner.name
    )


@router.post("/generate/{partner_id}")
async def generate_partner_qr(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Генерация QR кода для партнёра
    Только для владельцев партнёров или админов
    """
    # Получаем партнёра
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Проверка прав (упрощённая)
    # В продакшене добавьте проверку ролей
    if partner.owner_id != current_user.id:
        # Проверяем, является ли пользователь админом
        from app.models.role import UserRole, Role
        admin_role = db.query(Role).filter(Role.code == "admin").first()
        if admin_role:
            user_is_admin = db.query(UserRole).filter(
                UserRole.user_id == current_user.id,
                UserRole.role_id == admin_role.id
            ).first()
            if not user_is_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only partner owner or admin can generate QR code"
                )
    
    # Генерируем QR код
    qr_url = await qr_service.generate_partner_qr(
        partner_id=partner.id,
        partner_name=partner.name
    )
    
    # Сохраняем URL в базе
    partner.qr_code_url = qr_url
    db.commit()
    
    return {
        "success": True,
        "partner_id": partner.id,
        "qr_code_url": qr_url,
        "message": "QR code generated successfully"
    }

