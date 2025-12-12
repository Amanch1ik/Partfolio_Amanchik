"""
QR Code Schemas
Pydantic schemas for QR code operations
"""
from pydantic import BaseModel, Field
from typing import Optional


class QRPaymentRequest(BaseModel):
    """
    Request schema for QR code payment
    """
    partner_id: int = Field(..., description="ID партнёра")
    amount: float = Field(..., description="Сумма оплаты", gt=0)
    qr_data: Optional[str] = Field(None, description="Данные QR кода")
    
    class Config:
        schema_extra = {
            "example": {
                "partner_id": 1,
                "amount": 1000.0,
                "qr_data": "partner:1:timestamp:12345"
            }
        }


class QRPaymentResponse(BaseModel):
    """
    Response schema for QR code payment
    """
    success: bool = Field(..., description="Успешность операции")
    transaction_id: int = Field(..., description="ID транзакции")
    amount_charged: float = Field(..., description="Списанная сумма")
    discount_applied: float = Field(..., description="Примененная скидка")
    cashback_earned: float = Field(..., description="Начисленный кэшбэк")
    new_balance: float = Field(..., description="Новый баланс")
    partner_name: str = Field(..., description="Название партнёра")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "transaction_id": 123,
                "amount_charged": 900.0,
                "discount_applied": 100.0,
                "cashback_earned": 45.0,
                "new_balance": 1500.0,
                "partner_name": "Кафе Арзу"
            }
        }


class QRGenerateResponse(BaseModel):
    """
    Response schema for QR code generation
    """
    success: bool
    partner_id: int
    qr_code_url: str
    message: str
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "partner_id": 1,
                "qr_code_url": "/static/qrcodes/partner_1_qr.png",
                "message": "QR code generated successfully"
            }
        }

