"""Partner schemas"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal

# ---- Базовые модели ----

class PartnerBase(BaseModel):
    id: int
    name: str
    category: str
    logo_url: Optional[str] = None

    class Config:
        orm_mode = True


# ---- Модель, которую не хватало ----

class PartnerResponse(BaseModel):
    id: int
    name: str
    category: str
    logo_url: Optional[str]
    default_cashback_rate: float

    class Config:
        orm_mode = True


# ---- Рекомендации ----

class PartnerRecommendation(PartnerBase):
    cashback_rate: float = Field(
        ..., description="Персонализированный кешбэк для пользователя", ge=0, le=100
    )

    @validator('cashback_rate')
    def validate_cashback_rate(cls, v):
        return round(v, 2)


# ---- Детальная карточка партнёра ----

class PartnerDetail(PartnerBase):
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    default_cashback_rate: float = Field(..., ge=0, le=100)
    current_promotions: Optional[List[str]] = None


# ---- Создание / обновление ----

class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    default_cashback_rate: float = Field(default=5.0, ge=0, le=100)


class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    default_cashback_rate: Optional[float] = Field(None, ge=0, le=100)


# ---- Локации партнёров ----

class PartnerLocationResponse(BaseModel):
    id: int
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    phone_number: Optional[str]
    working_hours: Optional[str]
    partner_id: int
    partner_name: str
    max_discount_percent: float

    class Config:
        orm_mode = True


# ---- Поиск / фильтрация ----

class NearbyPartnerRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius: float = Field(default=10, ge=0.1, le=100)


class RouteRequest(BaseModel):
    partner_location_ids: List[int] = Field(..., min_items=2)


class RouteResponse(BaseModel):
    route_points: List[Dict[str, Any]]
    total_distance: float
    estimated_time: int


class LocationUpdateRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    @validator('latitude', 'longitude')
    def validate_coordinates(cls, v):
        return v


class PartnerFilterRequest(BaseModel):
    categories: Optional[List[str]]
    min_cashback: Optional[float] = Field(None, ge=0, le=100)
    max_distance: Optional[float] = Field(None, ge=0)
    is_verified: Optional[bool]
    working_hours: Optional[str]
    tags: Optional[List[str]]


class PartnerSortRequest(BaseModel):
    sort_by: Optional[str] = Field(default='distance')
    sort_order: Optional[str] = Field(default='asc')


class PartnerSearchRequest(BaseModel):
    query: Optional[str]
    filter: Optional[PartnerFilterRequest]
    sort: Optional[PartnerSortRequest]
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)

    @validator('query')
    def validate_query(cls, v):
        if v and len(v) < 2:
            raise ValueError("Запрос должен содержать ≥ 2 символов")
        return v
