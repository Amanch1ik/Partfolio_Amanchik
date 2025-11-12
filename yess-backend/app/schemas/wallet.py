"""Wallet schemas"""
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class WalletResponse(BaseModel):
    balance: Decimal
    last_updated: datetime
    
    class Config:
        from_attributes = True


class TopUpRequest(BaseModel):
    user_id: int
    amount: Decimal


class TopUpResponse(BaseModel):
    transaction_id: int
    payment_url: str
    qr_code_data: str

