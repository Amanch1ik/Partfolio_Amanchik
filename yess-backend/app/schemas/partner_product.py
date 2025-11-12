"""Schemas for Partner Products"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class PartnerProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    name_kg: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    description_kg: Optional[str] = None
    description_ru: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    category: str = Field(..., max_length=50)
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    is_available: bool = True
    stock_quantity: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=100)
    weight: Optional[Decimal] = Field(None, ge=0)
    volume: Optional[Decimal] = Field(None, ge=0)
    discount_percent: Decimal = Field(default=0.0, ge=0, le=100)
    original_price: Optional[Decimal] = Field(None, ge=0)
    sort_order: int = 0


class PartnerProductCreate(PartnerProductBase):
    partner_id: int


class PartnerProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    name_kg: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    description_kg: Optional[str] = None
    description_ru: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    is_available: Optional[bool] = None
    stock_quantity: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=100)
    weight: Optional[Decimal] = Field(None, ge=0)
    volume: Optional[Decimal] = Field(None, ge=0)
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    original_price: Optional[Decimal] = Field(None, ge=0)
    sort_order: Optional[int] = None


class PartnerProductResponse(PartnerProductBase):
    id: int
    partner_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PartnerProductListResponse(BaseModel):
    items: List[PartnerProductResponse]
    total: int
    page: int
    page_size: int


class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    notes: Optional[str] = None


class CartResponse(BaseModel):
    partner_id: int
    items: List[dict]  # {product: PartnerProductResponse, quantity: int, subtotal: Decimal}
    total: Decimal
    item_count: int

