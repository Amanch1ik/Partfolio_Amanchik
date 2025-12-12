"""Order schemas"""
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    notes: Optional[str] = None


class OrderCreateRequest(BaseModel):
    partner_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)
    delivery_address: Optional[str] = None
    delivery_type: str = Field(default="pickup")  # "pickup" or "delivery"
    delivery_notes: Optional[str] = None
    idempotency_key: str


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_price: Decimal
    quantity: int
    subtotal: Decimal
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    user_id: int
    partner_id: int
    order_total: Decimal
    discount: Decimal
    cashback_amount: Decimal
    final_amount: Decimal
    status: OrderStatus
    delivery_address: Optional[str] = None
    delivery_type: str
    payment_status: str
    items: List[OrderItemResponse] = []
    created_at: datetime
    paid_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrderCalculateRequest(BaseModel):
    partner_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)


class OrderCalculateResponse(BaseModel):
    order_total: Decimal
    discount: Decimal
    cashback_amount: Decimal
    final_amount: Decimal
    max_discount: Decimal
    user_balance: Optional[Decimal] = None


class OrderConfirmRequest(BaseModel):
    partner_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)
    delivery_address: Optional[str] = None
    delivery_type: str = Field(default="pickup")
    delivery_notes: Optional[str] = None
    idempotency_key: str


class OrderConfirmResponse(BaseModel):
    success: bool
    message: str
    order_id: int
    order_total: Decimal
    discount: Decimal
    cashback_amount: Decimal
    final_amount: Decimal
    new_balance: Optional[Decimal] = None

