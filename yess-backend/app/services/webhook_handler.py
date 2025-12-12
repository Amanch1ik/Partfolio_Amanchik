"""
Webhook Handler для банков Кыргызстана
Обработка уведомлений о статусе платежей от банков
"""

import asyncio
import hashlib
import hmac
import json
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.payment import Transaction, PaymentMethod
from app.models.user import User
from app.models.wallet import Wallet
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class WebhookHandler:
    """Обработчик webhook'ов от банков"""
    
    def __init__(self):
        self.bank_secrets = {
            "optimal": settings.OPTIMAL_BANK_SECRET_KEY,
            "demir": settings.DEMIR_BANK_SECRET_KEY,
            "rsk": settings.RSK_BANK_SECRET_KEY,
            "bakai": settings.BAKAI_BANK_SECRET_KEY,
            "elcart": settings.ELCART_SECRET_KEY
        }
    
    async def verify_signature(self, payload: str, signature: str, bank_type: str) -> bool:
        """Проверка подписи webhook'а"""
        
        if bank_type not in self.bank_secrets:
            logger.error(f"Unknown bank type: {bank_type}")
            return False
        
        secret = self.bank_secrets[bank_type]
        if not secret:
            logger.error(f"Secret key not configured for {bank_type}")
            return False
        
        # Создаем подпись
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Сравниваем подписи
        return hmac.compare_digest(signature, expected_signature)
    
    async def handle_payment_webhook(self, bank_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка webhook'а о статусе платежа"""
        
        try:
            # Извлекаем данные из payload
            transaction_id = payload.get("transaction_id")
            status = payload.get("status")
            amount = payload.get("amount")
            currency = payload.get("currency", "KGS")
            bank_transaction_id = payload.get("bank_transaction_id")
            error_message = payload.get("error_message")
            
            if not transaction_id or not status:
                raise HTTPException(status_code=400, detail="Missing required fields")
            
            # Получаем транзакцию из БД
            db = next(get_db())
            try:
                transaction = db.query(Transaction).filter(
                    Transaction.id == transaction_id
                ).first()
                
                if not transaction:
                    logger.error(f"Transaction {transaction_id} not found")
                    raise HTTPException(status_code=404, detail="Transaction not found")
                
                # Обновляем статус транзакции
                old_status = transaction.status
                transaction.status = status
                transaction.bank_transaction_id = bank_transaction_id
                transaction.updated_at = datetime.utcnow()
                
                if error_message:
                    transaction.error_message = error_message
                
                # Обрабатываем успешный платеж
                if status == "completed":
                    await self._process_successful_payment(db, transaction, amount, currency)
                elif status == "failed":
                    await self._process_failed_payment(db, transaction, error_message)
                elif status == "cancelled":
                    await self._process_cancelled_payment(db, transaction)
                
                db.commit()
                
                logger.info(f"Transaction {transaction_id} status updated: {old_status} -> {status}")
                
                return {
                    "success": True,
                    "message": "Webhook processed successfully",
                    "transaction_id": transaction_id,
                    "status": status
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def _process_successful_payment(self, db: Session, transaction: Transaction, amount: float, currency: str):
        """Обработка успешного платежа"""
        
        try:
            # Получаем пользователя и кошелек
            user = db.query(User).filter(User.id == transaction.user_id).first()
            wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
            
            if not user or not wallet:
                logger.error(f"User or wallet not found for transaction {transaction.id}")
                return
            
            # Пополняем кошелек
            wallet.balance += amount
            wallet.updated_at = datetime.utcnow()
            
            # Обновляем транзакцию
            transaction.amount = amount
            transaction.currency = currency
            transaction.completed_at = datetime.utcnow()
            
            logger.info(f"Wallet {wallet.id} replenished with {amount} {currency}")
            
            # Отправляем уведомление пользователю
            await self._send_payment_notification(user, amount, currency, "success")
            
        except Exception as e:
            logger.error(f"Error processing successful payment: {e}")
            raise
    
    async def _process_failed_payment(self, db: Session, transaction: Transaction, error_message: str):
        """Обработка неудачного платежа"""
        
        try:
            # Получаем пользователя
            user = db.query(User).filter(User.id == transaction.user_id).first()
            
            if not user:
                logger.error(f"User not found for transaction {transaction.id}")
                return
            
            # Обновляем транзакцию
            transaction.failed_at = datetime.utcnow()
            transaction.error_message = error_message
            
            logger.info(f"Payment failed for transaction {transaction.id}: {error_message}")
            
            # Отправляем уведомление пользователю
            await self._send_payment_notification(user, 0, "KGS", "failed", error_message)
            
        except Exception as e:
            logger.error(f"Error processing failed payment: {e}")
            raise
    
    async def _process_cancelled_payment(self, db: Session, transaction: Transaction):
        """Обработка отмененного платежа"""
        
        try:
            # Получаем пользователя
            user = db.query(User).filter(User.id == transaction.user_id).first()
            
            if not user:
                logger.error(f"User not found for transaction {transaction.id}")
                return
            
            # Обновляем транзакцию
            transaction.cancelled_at = datetime.utcnow()
            
            logger.info(f"Payment cancelled for transaction {transaction.id}")
            
            # Отправляем уведомление пользователю
            await self._send_payment_notification(user, 0, "KGS", "cancelled")
            
        except Exception as e:
            logger.error(f"Error processing cancelled payment: {e}")
            raise
    
    async def _send_payment_notification(self, user: User, amount: float, currency: str, status: str, error_message: str = None):
        """Отправка уведомления о статусе платежа"""
        
        try:
            # Здесь будет интеграция с сервисом уведомлений
            # Пока просто логируем
            
            if status == "success":
                message = f"Платеж на сумму {amount} {currency} успешно обработан"
                message_kg = f"{amount} {currency} суммадагы төлөм ийгиликтүү аткарылды"
                message_ru = f"Платеж на сумму {amount} {currency} успешно обработан"
            elif status == "failed":
                message = f"Платеж не удался: {error_message}"
                message_kg = f"Төлөм ийгиликтүү болгон жок: {error_message}"
                message_ru = f"Платеж не удался: {error_message}"
            else:  # cancelled
                message = "Платеж отменен"
                message_kg = "Төлөм жокко чыгарылды"
                message_ru = "Платеж отменен"
            
            logger.info(f"Notification sent to user {user.id}: {message}")
            
            # TODO: Интеграция с FCM, SMS, Email
            
        except Exception as e:
            logger.error(f"Error sending payment notification: {e}")

# Глобальный экземпляр обработчика
webhook_handler = WebhookHandler()

# Функции для использования в API endpoints
async def verify_bank_webhook(request: Request, bank_type: str) -> Dict[str, Any]:
    """Верификация webhook'а от банка"""
    
    # Получаем подпись из заголовков
    signature = request.headers.get("X-Signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature")
    
    # Получаем тело запроса
    body = await request.body()
    payload_str = body.decode('utf-8')
    
    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Проверяем подпись
    if not await webhook_handler.verify_signature(payload_str, signature, bank_type):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return payload

async def process_bank_webhook(bank_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Обработка webhook'а от банка"""
    return await webhook_handler.handle_payment_webhook(bank_type, payload)
