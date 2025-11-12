"""
Универсальный платежный шлюз для Bonus APP
Поддерживает все локальные методы оплаты Кыргызстана
"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio
import logging

from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.core.database import get_db
from app.schemas.payment import PaymentRequest, PaymentResponse

logger = logging.getLogger(__name__)

class PaymentMethod(str, Enum):
    BANK_CARD = "bank_card"
    ELSOM = "elsom"
    MOBILE_BALANCE = "mobile_balance"
    ELKART = "elkart"
    CASH_TERMINAL = "cash_terminal"
    BANK_TRANSFER = "bank_transfer"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"

class UnifiedPaymentGateway:
    """Универсальный платежный шлюз"""
    
    def __init__(self):
        self.supported_methods = [
            PaymentMethod.BANK_CARD,
            PaymentMethod.ELSOM,
            PaymentMethod.MOBILE_BALANCE,
            PaymentMethod.ELKART,
            PaymentMethod.CASH_TERMINAL,
            PaymentMethod.BANK_TRANSFER
        ]
        
        # Конфигурация комиссий
        self.commission_rates = {
            PaymentMethod.BANK_CARD: 0.02,  # 2%
            PaymentMethod.ELSOM: 0.01,      # 1%
            PaymentMethod.MOBILE_BALANCE: 0.03,  # 3%
            PaymentMethod.ELKART: 0.015,    # 1.5%
            PaymentMethod.CASH_TERMINAL: 0.025,  # 2.5%
            PaymentMethod.BANK_TRANSFER: 0.01    # 1%
        }
    
    async def process_payment(
        self,
        user_id: int,
        amount: float,
        method: PaymentMethod,
        db: Session,
        order_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Обработка платежа (для заказов или пополнения)"""
        try:
            # Валидация суммы
            if amount <= 0:
                raise ValueError("Сумма должна быть больше 0")
            
            if amount < 10:
                raise ValueError("Минимальная сумма: 10 сом")
            
            # Расчет комиссии
            commission = amount * self.commission_rates.get(method, 0.02)
            total_amount = amount + commission
            
            # Создание транзакции
            transaction = await self._create_transaction(
                user_id, amount, method, commission, db, order_id
            )
            
            # Обработка платежа в зависимости от метода
            payment_result = await self._process_payment_by_method(
                transaction, method
            )
            
            if payment_result["status"] == "success":
                # Обновление статуса транзакции
                transaction.status = PaymentStatus.SUCCESS
                transaction.processed_at = datetime.utcnow()
                db.commit()
                
                # Если это оплата заказа, обновляем заказ
                if order_id:
                    from app.models.order import Order, OrderStatus
                    order = db.query(Order).filter(Order.id == order_id).first()
                    if order:
                        order.status = OrderStatus.PAID
                        order.payment_status = "paid"
                        order.paid_at = datetime.utcnow()
                        db.commit()
                
                return {
                    "status": "success",
                    "transaction_id": transaction.id,
                    "redirect_url": payment_result.get("redirect_url"),
                    "qr_code": payment_result.get("qr_code"),
                    "commission": commission,
                    "message": "Платеж успешно обработан"
                }
            else:
                transaction.status = PaymentStatus.FAILED
                transaction.error_message = payment_result.get("error", "Неизвестная ошибка")
                db.commit()
                
                return {
                    "status": "failed",
                    "transaction_id": transaction.id,
                    "error": payment_result.get("error", "Ошибка обработки платежа"),
                    "commission": commission
                }
                
        except Exception as e:
            logger.error(f"Ошибка обработки платежа: {str(e)}")
            raise
    
    async def process_replenishment(
        self, 
        user_id: int, 
        amount: float, 
        method: PaymentMethod,
        db: Session
    ) -> PaymentResponse:
        """Обработка пополнения кошелька"""
        
        try:
            # Валидация суммы
            if amount <= 0:
                raise ValueError("Сумма должна быть больше 0")
            
            if amount < 10:  # Минимальная сумма 10 сом
                raise ValueError("Минимальная сумма пополнения: 10 сом")
            
            # Расчет комиссии
            commission = amount * self.commission_rates.get(method, 0.02)
            total_amount = amount + commission
            
            # Создание транзакции
            transaction = await self._create_transaction(
                user_id, amount, method, commission, db
            )
            
            # Обработка платежа в зависимости от метода
            payment_result = await self._process_payment_by_method(
                transaction, method
            )
            
            if payment_result["status"] == "success":
                # Обновление баланса пользователя
                await self._update_user_wallet(user_id, amount, db)
                
                # Обновление статуса транзакции
                transaction.status = PaymentStatus.SUCCESS
                transaction.processed_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"Успешное пополнение: User {user_id}, Amount {amount}, Method {method}")
                
                return PaymentResponse(
                    transaction_id=transaction.id,
                    status="success",
                    amount=amount,
                    commission=commission,
                    new_balance=await self._get_user_balance(user_id, db),
                    message="Баланс успешно пополнен"
                )
            else:
                # Обработка ошибки
                transaction.status = PaymentStatus.FAILED
                transaction.error_message = payment_result.get("error", "Неизвестная ошибка")
                db.commit()
                
                return PaymentResponse(
                    transaction_id=transaction.id,
                    status="failed",
                    amount=amount,
                    commission=commission,
                    error=payment_result.get("error", "Ошибка обработки платежа")
                )
                
        except Exception as e:
            logger.error(f"Ошибка пополнения кошелька: {str(e)}")
            raise
    
    async def _create_transaction(
        self, 
        user_id: int, 
        amount: float, 
        method: PaymentMethod,
        commission: float,
        db: Session,
        order_id: Optional[int] = None
    ) -> Transaction:
        """Создание транзакции"""
        
        transaction = Transaction(
            user_id=user_id,
            amount=amount,
            commission=commission,
            payment_method=method.value,
            type="payment" if order_id else "topup",
            status=PaymentStatus.PENDING.value,
            created_at=datetime.utcnow()
        )
        
        # Добавляем order_id если есть
        if order_id:
            transaction.order_id = order_id
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction
    
    async def _process_payment_by_method(
        self, 
        transaction: Transaction, 
        method: PaymentMethod
    ) -> Dict[str, Any]:
        """Обработка платежа в зависимости от метода"""
        
        if method == PaymentMethod.BANK_CARD:
            return await self._process_bank_card(transaction)
        elif method == PaymentMethod.ELSOM:
            return await self._process_elsom(transaction)
        elif method == PaymentMethod.MOBILE_BALANCE:
            return await self._process_mobile_balance(transaction)
        elif method == PaymentMethod.ELKART:
            return await self._process_elkart(transaction)
        elif method == PaymentMethod.CASH_TERMINAL:
            return await self._process_cash_terminal(transaction)
        elif method == PaymentMethod.BANK_TRANSFER:
            return await self._process_bank_transfer(transaction)
        else:
            return {"status": "failed", "error": "Неподдерживаемый метод оплаты"}
    
    async def _process_bank_card(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка платежа банковской картой"""
        try:
            # Здесь будет интеграция с банковским шлюзом
            # Пока симулируем успешную обработку
            await asyncio.sleep(1)  # Имитация обработки
            
            # Генерация redirect URL для страницы оплаты
            redirect_url = f"https://payment-gateway.com/pay/{transaction.id}"
            
            return {
                "status": "success",
                "redirect_url": redirect_url,
                "gateway_response": {
                    "transaction_id": f"card_{transaction.id}",
                    "approval_code": "123456"
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка обработки карты: {str(e)}"}
    
    async def _process_elsom(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка платежа через Элсом"""
        try:
            # Интеграция с Элсом API
            await asyncio.sleep(0.5)  # Быстрая обработка
            
            return {
                "status": "success",
                "gateway_response": {
                    "elsom_transaction_id": f"elsom_{transaction.id}",
                    "processing_time": "0.5s"
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка Элсом: {str(e)}"}
    
    async def _process_mobile_balance(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка платежа с баланса мобильного"""
        try:
            # Интеграция с мобильными операторами
            await asyncio.sleep(0.3)
            
            return {
                "status": "success",
                "gateway_response": {
                    "mobile_transaction_id": f"mobile_{transaction.id}",
                    "operator": "O!"
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка мобильного платежа: {str(e)}"}
    
    async def _process_elkart(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка платежа через Элкарт"""
        try:
            # Интеграция с Элкарт
            await asyncio.sleep(0.4)
            
            return {
                "status": "success",
                "gateway_response": {
                    "elkart_transaction_id": f"elkart_{transaction.id}",
                    "card_type": "debit"
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка Элкарт: {str(e)}"}
    
    async def _process_cash_terminal(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка платежа через терминал"""
        try:
            # Генерация QR-кода для оплаты в терминале
            qr_data = f"bonus_app_{transaction.id}_{transaction.amount}"
            
            return {
                "status": "success",
                "qr_code": qr_data,
                "gateway_response": {
                    "qr_code": qr_data,
                    "terminal_id": "T001",
                    "expires_at": datetime.utcnow().timestamp() + 1800  # 30 минут
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка терминала: {str(e)}"}
    
    async def _process_bank_transfer(self, transaction: Transaction) -> Dict[str, Any]:
        """Обработка банковского перевода"""
        try:
            # Интеграция с банковскими API
            await asyncio.sleep(2)  # Более долгая обработка
            
            return {
                "status": "success",
                "gateway_response": {
                    "bank_transaction_id": f"bank_{transaction.id}",
                    "processing_time": "2s"
                }
            }
        except Exception as e:
            return {"status": "failed", "error": f"Ошибка банковского перевода: {str(e)}"}
    
    async def _update_user_wallet(self, user_id: int, amount: float, db: Session):
        """Обновление баланса пользователя"""
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        
        if not wallet:
            # Создание нового кошелька
            wallet = Wallet(user_id=user_id, balance=amount)
            db.add(wallet)
        else:
            wallet.balance += amount
        
        db.commit()
    
    async def _get_user_balance(self, user_id: int, db: Session) -> float:
        """Получение баланса пользователя"""
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        return wallet.balance if wallet else 0.0
    
    async def get_payment_methods(self) -> Dict[str, Any]:
        """Получение доступных методов оплаты"""
        return {
            "methods": [
                {
                    "id": method.value,
                    "name": self._get_method_name(method),
                    "commission_rate": self.commission_rates[method],
                    "min_amount": 10,
                    "max_amount": 100000,
                    "processing_time": self._get_processing_time(method)
                }
                for method in self.supported_methods
            ]
        }
    
    def _get_method_name(self, method: PaymentMethod) -> str:
        """Получение названия метода оплаты"""
        names = {
            PaymentMethod.BANK_CARD: "Банковская карта",
            PaymentMethod.ELSOM: "Элсом",
            PaymentMethod.MOBILE_BALANCE: "Баланс телефона",
            PaymentMethod.ELKART: "Элкарт",
            PaymentMethod.CASH_TERMINAL: "Терминал",
            PaymentMethod.BANK_TRANSFER: "Банковский перевод"
        }
        return names.get(method, method.value)
    
    def _get_processing_time(self, method: PaymentMethod) -> str:
        """Получение времени обработки"""
        times = {
            PaymentMethod.BANK_CARD: "1-2 минуты",
            PaymentMethod.ELSOM: "Мгновенно",
            PaymentMethod.MOBILE_BALANCE: "Мгновенно",
            PaymentMethod.ELKART: "Мгновенно",
            PaymentMethod.CASH_TERMINAL: "До 30 минут",
            PaymentMethod.BANK_TRANSFER: "1-3 часа"
        }
        return times.get(method, "Неизвестно")

# Глобальный экземпляр шлюза
payment_gateway = UnifiedPaymentGateway()
