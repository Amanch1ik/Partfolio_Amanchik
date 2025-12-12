from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"

class PaginationMetadata(BaseModel):
    total_items: int = Field(..., description="Общее количество элементов")
    total_pages: int = Field(..., description="Общее количество страниц")
    current_page: int = Field(..., description="Текущая страница")
    page_size: int = Field(..., description="Количество элементов на странице")

class BaseResponse(BaseModel):
    status: ResponseStatus = ResponseStatus.SUCCESS
    message: Optional[str] = None
    metadata: Optional[PaginationMetadata] = None

class UserResponse(BaseResponse):
    id: int
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    loyalty_level: Optional[str] = None

class PartnerResponse(BaseResponse):
    id: int
    name: str
    category: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    cashback_rate: float = Field(ge=0, le=100)
    is_verified: bool = False
    location: Optional[Dict[str, float]] = None

class TransactionResponse(BaseResponse):
    id: int
    partner_id: int
    partner_name: str
    amount: float
    cashback_earned: float
    type: str
    date: datetime

class WalletResponse(BaseResponse):
    balance: float
    total_cashback: float
    loyalty_points: int
    loyalty_level: str

class NotificationResponse(BaseResponse):
    id: int
    title: str
    body: str
    type: str
    is_read: bool
    created_at: datetime

class RouteResponse(BaseResponse):
    total_distance: str
    estimated_time: str
    route_points: List[Dict[str, Any]]

class ErrorResponse(BaseModel):
    status: ResponseStatus = ResponseStatus.ERROR
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None

    @validator('status', always=True)
    def set_status_to_error(cls, v):
        return ResponseStatus.ERROR

class AuthResponse(BaseResponse):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RecommendationResponse(BaseResponse):
    recommendations: List[PartnerResponse]
    personalization_score: Optional[float] = None

class GeolocationResponse(BaseResponse):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: datetime

class MultiLanguageResponse(BaseResponse):
    translations: Dict[str, str]
    source_language: str
    target_language: str
