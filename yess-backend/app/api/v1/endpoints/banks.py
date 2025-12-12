"""
Полная интеграция с банками Кыргызстана
Поддержка всех основных банков КР
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime, timedelta
import logging
import httpx
import hashlib
import hmac
import json
from enum import Enum

from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.payment import PaymentMethod
from app.core.security import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/banks", tags=["banks"])

class BankType(str, Enum):
    OPTIMAL = "optimal"
    DEMIR = "demir"
    RSK = "rsk"
    BAKAI = "bakai"
    ELCART = "elcart"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    PAYMENT = "payment"
    REFUND = "refund"

# Schemas
class BankPaymentRequest(BaseModel):
    user_id: int
    amount: float
    bank_type: BankType
    transaction_type: TransactionType
    description: Optional[str] = None
    callback_url: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v < 10:  # Минимальная сумма 10 сом
            raise ValueError('Minimum amount is 10 KGS')
        if v > 100000:  # Максимальная сумма 100,000 сом
            raise ValueError('Maximum amount is 100,000 KGS')
        return v

class BankPaymentResponse(BaseModel):
    transaction_id: str
    payment_url: str
    status: PaymentStatus
    amount: float
    currency: str
    expires_at: datetime
    bank_reference: Optional[str] = None

class BankWebhookRequest(BaseModel):
    transaction_id: str
    status: PaymentStatus
    amount: float
    bank_reference: str
    signature: str
    timestamp: datetime
    additional_data: Optional[Dict[str, Any]] = None

class BankBalanceResponse(BaseModel):
    bank_type: BankType
    balance: float
    currency: str
    last_updated: datetime
    is_available: bool

# Services
class OptimalBankService:
    """Сервис для работы с Оптима Банком"""
    
    def __init__(self):
        self.api_url = settings.OPTIMAL_BANK_API_URL
        self.merchant_id = settings.OPTIMAL_BANK_MERCHANT_ID
        self.secret_key = settings.OPTIMAL_BANK_SECRET_KEY
        self.commission_rate = 0.018  # 1.8%
    
    async def create_payment(
        self, 
        amount: float, 
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через Оптима Банк"""
        
        try:
            # Подготовка данных для API
            payment_data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "KGS",
                "transaction_id": transaction_id,
                "description": description,
                "callback_url": f"{settings.BASE_URL}/api/v1/banks/webhooks/optimal",
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "timestamp": int(datetime.utcnow().timestamp())
            }
            
            # Создание подписи
            signature = self._create_signature(payment_data)
            payment_data["signature"] = signature
            
            # Отправка запроса
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/payment/create",
                    json=payment_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "payment_url": result.get("payment_url"),
                        "bank_reference": result.get("reference_id"),
                        "expires_at": datetime.utcnow() + timedelta(minutes=30)
                    }
                else:
                    logger.error(f"Optimal Bank API error: {response.text}")
                    return {"success": False, "error": "Bank API error"}
                    
        except Exception as e:
            logger.error(f"Error creating Optimal Bank payment: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_signature(self, data: Dict[str, Any]) -> str:
        """Создание подписи для Оптима Банка"""
        
        # Сортируем параметры по ключу
        sorted_params = sorted(data.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        # Создаем HMAC подпись
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def verify_webhook(self, data: Dict[str, Any]) -> bool:
        """Верификация webhook от Оптима Банка"""
        
        try:
            received_signature = data.get("signature")
            if not received_signature:
                return False
            
            # Создаем подпись для проверки
            data_copy = data.copy()
            data_copy.pop("signature", None)
            expected_signature = self._create_signature(data_copy)
            
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying Optimal Bank webhook: {e}")
            return False

class DemirBankService:
    """Сервис для работы с Демир Банком"""
    
    def __init__(self):
        self.api_url = settings.DEMIR_BANK_API_URL
        self.merchant_id = settings.DEMIR_BANK_MERCHANT_ID
        self.secret_key = settings.DEMIR_BANK_SECRET_KEY
        self.commission_rate = 0.020  # 2.0%
    
    async def create_payment(
        self, 
        amount: float, 
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через Демир Банк"""
        
        try:
            payment_data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "KGS",
                "transaction_id": transaction_id,
                "description": description,
                "callback_url": f"{settings.BASE_URL}/api/v1/banks/webhooks/demir",
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "timestamp": int(datetime.utcnow().timestamp())
            }
            
            signature = self._create_signature(payment_data)
            payment_data["signature"] = signature
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/v1/payments",
                    json=payment_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "payment_url": result.get("payment_url"),
                        "bank_reference": result.get("reference_id"),
                        "expires_at": datetime.utcnow() + timedelta(minutes=30)
                    }
                else:
                    logger.error(f"Demir Bank API error: {response.text}")
                    return {"success": False, "error": "Bank API error"}
                    
        except Exception as e:
            logger.error(f"Error creating Demir Bank payment: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_signature(self, data: Dict[str, Any]) -> str:
        """Создание подписи для Демир Банка"""
        
        sorted_params = sorted(data.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def verify_webhook(self, data: Dict[str, Any]) -> bool:
        """Верификация webhook от Демир Банка"""
        
        try:
            received_signature = data.get("signature")
            if not received_signature:
                return False
            
            data_copy = data.copy()
            data_copy.pop("signature", None)
            expected_signature = self._create_signature(data_copy)
            
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying Demir Bank webhook: {e}")
            return False

class RSKBankService:
    """Сервис для работы с РСК Банком"""
    
    def __init__(self):
        self.api_url = settings.RSK_BANK_API_URL
        self.merchant_id = settings.RSK_BANK_MERCHANT_ID
        self.secret_key = settings.RSK_BANK_SECRET_KEY
        self.commission_rate = 0.018  # 1.8%
    
    async def create_payment(
        self, 
        amount: float, 
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через РСК Банк"""
        
        try:
            payment_data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "KGS",
                "transaction_id": transaction_id,
                "description": description,
                "callback_url": f"{settings.BASE_URL}/api/v1/banks/webhooks/rsk",
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "timestamp": int(datetime.utcnow().timestamp())
            }
            
            signature = self._create_signature(payment_data)
            payment_data["signature"] = signature
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/payment/create",
                    json=payment_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "payment_url": result.get("payment_url"),
                        "bank_reference": result.get("reference_id"),
                        "expires_at": datetime.utcnow() + timedelta(minutes=30)
                    }
                else:
                    logger.error(f"RSK Bank API error: {response.text}")
                    return {"success": False, "error": "Bank API error"}
                    
        except Exception as e:
            logger.error(f"Error creating RSK Bank payment: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_signature(self, data: Dict[str, Any]) -> str:
        """Создание подписи для РСК Банка"""
        
        sorted_params = sorted(data.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def verify_webhook(self, data: Dict[str, Any]) -> bool:
        """Верификация webhook от РСК Банка"""
        
        try:
            received_signature = data.get("signature")
            if not received_signature:
                return False
            
            data_copy = data.copy()
            data_copy.pop("signature", None)
            expected_signature = self._create_signature(data_copy)
            
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying RSK Bank webhook: {e}")
            return False

class BakaiBankService:
    """Сервис для работы с Бакай Банком"""
    
    def __init__(self):
        self.api_url = settings.BAKAI_BANK_API_URL
        self.merchant_id = settings.BAKAI_BANK_MERCHANT_ID
        self.secret_key = settings.BAKAI_BANK_SECRET_KEY
        self.commission_rate = 0.016  # 1.6%
    
    async def create_payment(
        self, 
        amount: float, 
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через Бакай Банк"""
        
        try:
            payment_data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "KGS",
                "transaction_id": transaction_id,
                "description": description,
                "callback_url": f"{settings.BASE_URL}/api/v1/banks/webhooks/bakai",
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "timestamp": int(datetime.utcnow().timestamp())
            }
            
            signature = self._create_signature(payment_data)
            payment_data["signature"] = signature
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/payments",
                    json=payment_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "payment_url": result.get("payment_url"),
                        "bank_reference": result.get("reference_id"),
                        "expires_at": datetime.utcnow() + timedelta(minutes=30)
                    }
                else:
                    logger.error(f"Bakai Bank API error: {response.text}")
                    return {"success": False, "error": "Bank API error"}
                    
        except Exception as e:
            logger.error(f"Error creating Bakai Bank payment: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_signature(self, data: Dict[str, Any]) -> str:
        """Создание подписи для Бакай Банка"""
        
        sorted_params = sorted(data.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def verify_webhook(self, data: Dict[str, Any]) -> bool:
        """Верификация webhook от Бакай Банка"""
        
        try:
            received_signature = data.get("signature")
            if not received_signature:
                return False
            
            data_copy = data.copy()
            data_copy.pop("signature", None)
            expected_signature = self._create_signature(data_copy)
            
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying Bakai Bank webhook: {e}")
            return False

class ElcartService:
    """Сервис для работы с Элкарт"""
    
    def __init__(self):
        self.api_url = settings.ELCART_API_URL
        self.merchant_id = settings.ELCART_MERCHANT_ID
        self.secret_key = settings.ELCART_SECRET_KEY
        self.commission_rate = 0.014  # 1.4%
    
    async def create_payment(
        self, 
        amount: float, 
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через Элкарт"""
        
        try:
            payment_data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "KGS",
                "transaction_id": transaction_id,
                "description": description,
                "callback_url": f"{settings.BASE_URL}/api/v1/banks/webhooks/elcart",
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "timestamp": int(datetime.utcnow().timestamp())
            }
            
            signature = self._create_signature(payment_data)
            payment_data["signature"] = signature
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/payment/create",
                    json=payment_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "payment_url": result.get("payment_url"),
                        "bank_reference": result.get("reference_id"),
                        "expires_at": datetime.utcnow() + timedelta(minutes=30)
                    }
                else:
                    logger.error(f"Elcart API error: {response.text}")
                    return {"success": False, "error": "Bank API error"}
                    
        except Exception as e:
            logger.error(f"Error creating Elcart payment: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_signature(self, data: Dict[str, Any]) -> str:
        """Создание подписи для Элкарт"""
        
        sorted_params = sorted(data.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def verify_webhook(self, data: Dict[str, Any]) -> bool:
        """Верификация webhook от Элкарт"""
        
        try:
            received_signature = data.get("signature")
            if not received_signature:
                return False
            
            data_copy = data.copy()
            data_copy.pop("signature", None)
            expected_signature = self._create_signature(data_copy)
            
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying Elcart webhook: {e}")
            return False

class UnifiedBankService:
    """Унифицированный сервис для работы с банками КР"""
    
    def __init__(self):
        self.bank_services = {
            BankType.OPTIMAL: OptimalBankService(),
            BankType.DEMIR: DemirBankService(),
            BankType.RSK: RSKBankService(),
            BankType.BAKAI: BakaiBankService(),
            BankType.ELCART: ElcartService()
        }
    
    async def create_payment(
        self,
        bank_type: BankType,
        amount: float,
        transaction_id: str,
        description: str = "Bonus APP Payment"
    ) -> Dict[str, Any]:
        """Создание платежа через выбранный банк"""
        
        bank_service = self.bank_services.get(bank_type)
        if not bank_service:
            return {"success": False, "error": "Unsupported bank type"}
        
        return await bank_service.create_payment(amount, transaction_id, description)
    
    async def verify_webhook(
        self,
        bank_type: BankType,
        data: Dict[str, Any]
    ) -> bool:
        """Верификация webhook от банка"""
        
        bank_service = self.bank_services.get(bank_type)
        if not bank_service:
            return False
        
        return await bank_service.verify_webhook(data)
    
    def get_commission_rate(self, bank_type: BankType) -> float:
        """Получение комиссии банка"""
        
        bank_service = self.bank_services.get(bank_type)
        if not bank_service:
            return 0.0
        
        return bank_service.commission_rate
    
    def get_available_banks(self) -> List[Dict[str, Any]]:
        """Получение списка доступных банков"""
        
        return [
            {
                "code": BankType.OPTIMAL.value,
                "name": "Оптима Банк",
                "name_kg": "Оптима Банк",
                "commission_rate": 0.018,
                "is_available": True,
                "logo_url": "/static/banks/optimal.png"
            },
            {
                "code": BankType.DEMIR.value,
                "name": "Демир Банк",
                "name_kg": "Демир Банк",
                "commission_rate": 0.020,
                "is_available": True,
                "logo_url": "/static/banks/demir.png"
            },
            {
                "code": BankType.RSK.value,
                "name": "РСК Банк",
                "name_kg": "РСК Банк",
                "commission_rate": 0.018,
                "is_available": True,
                "logo_url": "/static/banks/rsk.png"
            },
            {
                "code": BankType.BAKAI.value,
                "name": "Бакай Банк",
                "name_kg": "Бакай Банк",
                "commission_rate": 0.016,
                "is_available": True,
                "logo_url": "/static/banks/bakai.png"
            },
            {
                "code": BankType.ELCART.value,
                "name": "Элкарт",
                "name_kg": "Элкарт",
                "commission_rate": 0.014,
                "is_available": True,
                "logo_url": "/static/banks/elcart.png"
            }
        ]

# Инициализация сервиса
bank_service = UnifiedBankService()

# API Endpoints
@router.post("/payment", response_model=BankPaymentResponse)
async def create_bank_payment(
    payment_request: BankPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание платежа через банк КР"""
    
    # Проверяем пользователя
    if payment_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Создаем транзакцию в базе данных
    transaction = Transaction(
        user_id=payment_request.user_id,
        amount=payment_request.amount,
        transaction_type=payment_request.transaction_type.value,
        status="pending",
        description=payment_request.description or f"Payment via {payment_request.bank_type.value}",
        payment_method=payment_request.bank_type.value,
        created_at=datetime.utcnow()
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Создаем платеж через банк
    payment_result = await bank_service.create_payment(
        bank_type=payment_request.bank_type,
        amount=payment_request.amount,
        transaction_id=str(transaction.id),
        description=payment_request.description or f"Bonus APP Payment - {transaction.id}"
    )
    
    if not payment_result["success"]:
        # Обновляем статус транзакции на failed
        transaction.status = "failed"
        db.commit()
        
        raise HTTPException(
            status_code=400,
            detail=f"Payment creation failed: {payment_result.get('error', 'Unknown error')}"
        )
    
    # Обновляем транзакцию с данными от банка
    transaction.bank_reference = payment_result.get("bank_reference")
    transaction.expires_at = payment_result.get("expires_at")
    db.commit()
    
    return BankPaymentResponse(
        transaction_id=str(transaction.id),
        payment_url=payment_result["payment_url"],
        status=PaymentStatus.PENDING,
        amount=payment_request.amount,
        currency="KGS",
        expires_at=payment_result["expires_at"],
        bank_reference=payment_result.get("bank_reference")
    )

@router.post("/webhooks/{bank_type}")
async def handle_bank_webhook(
    bank_type: BankType,
    webhook_data: BankWebhookRequest,
    db: Session = Depends(get_db)
):
    """Обработка webhook от банка"""
    
    # Верифицируем webhook
    is_valid = await bank_service.verify_webhook(bank_type, webhook_data.dict())
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    # Находим транзакцию
    transaction = db.query(Transaction).filter(
        Transaction.id == webhook_data.transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Обновляем статус транзакции
    transaction.status = webhook_data.status.value
    transaction.bank_reference = webhook_data.bank_reference
    transaction.updated_at = datetime.utcnow()
    
    # Если платеж успешен, обновляем баланс пользователя
    if webhook_data.status == PaymentStatus.SUCCESS:
        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user and user.wallet:
            if transaction.transaction_type == "deposit":
                user.wallet.balance += webhook_data.amount
            elif transaction.transaction_type == "withdrawal":
                user.wallet.balance -= webhook_data.amount
    
    db.commit()
    
    return {"message": "Webhook processed successfully"}

@router.get("/available", response_model=List[Dict[str, Any]])
async def get_available_banks():
    """Получение списка доступных банков"""
    
    return bank_service.get_available_banks()

@router.get("/commission/{bank_type}")
async def get_bank_commission(bank_type: BankType):
    """Получение комиссии банка"""
    
    commission_rate = bank_service.get_commission_rate(bank_type)
    
    return {
        "bank_type": bank_type.value,
        "commission_rate": commission_rate,
        "commission_percentage": f"{commission_rate * 100:.2f}%"
    }

@router.get("/balance/{bank_type}", response_model=BankBalanceResponse)
async def get_bank_balance(
    bank_type: BankType,
    current_user: User = Depends(get_current_user)
):
    """Получение баланса в банке (если поддерживается)"""
    
    # Здесь можно добавить логику получения баланса от банка
    # Пока возвращаем заглушку
    
    return BankBalanceResponse(
        bank_type=bank_type,
        balance=0.0,
        currency="KGS",
        last_updated=datetime.utcnow(),
        is_available=False
    )

@router.get("/status/{transaction_id}")
async def get_payment_status(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статуса платежа"""
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "transaction_id": transaction_id,
        "status": transaction.status,
        "amount": transaction.amount,
        "currency": "KGS",
        "created_at": transaction.created_at,
        "updated_at": transaction.updated_at,
        "bank_reference": transaction.bank_reference
    }

@router.post("/refund/{transaction_id}")
async def refund_payment(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возврат платежа"""
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status != "success":
        raise HTTPException(status_code=400, detail="Can only refund successful transactions")
    
    # Здесь можно добавить логику возврата через банк
    # Пока просто обновляем статус
    
    transaction.status = "refunded"
    transaction.updated_at = datetime.utcnow()
    
    # Возвращаем деньги на баланс
    user = db.query(User).filter(User.id == transaction.user_id).first()
    if user and user.wallet:
        user.wallet.balance -= transaction.amount
    
    db.commit()
    
    return {"message": "Refund processed successfully"}
