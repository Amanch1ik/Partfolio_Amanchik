"""
Схемы для платежной системы Bonus APP
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

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

class PaymentRequest(BaseModel):
    """Запрос на пополнение кошелька или оплату заказа"""
    amount: float = Field(..., gt=0, description="Сумма в сомах")
    method: PaymentMethod = Field(..., description="Метод оплаты")
    phone_number: Optional[str] = Field(None, description="Номер телефона для мобильных платежей")
    card_token: Optional[str] = Field(None, description="Токен карты для банковских платежей")
    order_id: Optional[int] = Field(None, description="ID заказа для оплаты")
    description: Optional[str] = Field(None, description="Описание платежа")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v < 10:
            raise ValueError('Минимальная сумма: 10 сом')
        if v > 100000:
            raise ValueError('Максимальная сумма: 100,000 сом')
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v, values):
        if values.get('method') in ['mobile_balance', 'elsom'] and not v:
            raise ValueError('Номер телефона обязателен для мобильных платежей')
        return v


class OrderPaymentRequest(BaseModel):
    """Запрос на оплату заказа"""
    order_id: int = Field(..., description="ID заказа")
    method: PaymentMethod = Field(..., description="Метод оплаты")
    phone_number: Optional[str] = Field(None, description="Номер телефона для мобильных платежей")
    card_token: Optional[str] = Field(None, description="Токен карты для банковских платежей")
    
    @validator('phone_number')
    def validate_phone(cls, v, values):
        if values.get('method') in ['mobile_balance', 'elsom'] and not v:
            raise ValueError('Номер телефона обязателен для мобильных платежей')
        return v

class PaymentResponse(BaseModel):
    """Ответ на запрос пополнения или оплаты заказа"""
    payment_id: Optional[int] = None
    transaction_id: Optional[int] = None
    order_id: Optional[int] = None
    status: str
    amount: float
    commission: float
    new_balance: Optional[float] = None
    message: Optional[str] = None
    error: Optional[str] = None
    redirect_url: Optional[str] = None  # URL для редиректа на страницу оплаты
    payment_url: Optional[str] = None  # Альтернативное название
    qr_code: Optional[str] = None  # QR код для оплаты
    expires_at: Optional[datetime] = None

class PaymentMethodInfo(BaseModel):
    """Информация о методе оплаты"""
    id: str
    name: str
    commission_rate: float
    min_amount: float
    max_amount: float
    processing_time: str
    is_available: bool = True

class PaymentMethodsResponse(BaseModel):
    """Ответ со списком доступных методов оплаты"""
    methods: List[PaymentMethodInfo]

class TransactionHistory(BaseModel):
    """История транзакций"""
    id: int
    amount: float
    commission: float
    payment_method: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class TransactionHistoryResponse(BaseModel):
    """Ответ с историей транзакций"""
    transactions: List[TransactionHistory]
    total_count: int
    page: int
    page_size: int

class WalletBalance(BaseModel):
    """Баланс кошелька"""
    balance: float
    currency: str = "KGS"
    last_updated: datetime

class PaymentConfirmation(BaseModel):
    """Подтверждение платежа"""
    transaction_id: int
    confirmation_code: Optional[str] = None
    sms_code: Optional[str] = None

class PaymentStatusCheck(BaseModel):
    """Проверка статуса платежа"""
    transaction_id: int

class PaymentStatusResponse(BaseModel):
    """Ответ с статусом платежа"""
    transaction_id: int
    status: str
    amount: float
    commission: float
    created_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None

class RefundRequest(BaseModel):
    """Запрос на возврат средств"""
    transaction_id: int
    reason: str
    amount: Optional[float] = None  # Если не указана, возвращается полная сумма

class RefundResponse(BaseModel):
    """Ответ на запрос возврата"""
    refund_id: int
    transaction_id: int
    amount: float
    status: str
    message: str
    processed_at: Optional[datetime] = None

class PaymentAnalytics(BaseModel):
    """Аналитика платежей"""
    total_replenishments: int
    total_amount: float
    average_amount: float
    success_rate: float
    methods_usage: Dict[str, int]
    daily_stats: List[Dict[str, Any]]

class PaymentLimits(BaseModel):
    """Лимиты платежей"""
    daily_limit: float
    monthly_limit: float
    single_transaction_limit: float
    used_daily: float
    used_monthly: float
