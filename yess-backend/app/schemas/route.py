from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum

class TransportMode(str, Enum):
    """Режимы передвижения"""
    DRIVING = "DRIVING"   # Автомобиль
    WALKING = "WALKING"   # Пешком
    BICYCLING = "BICYCLING"  # Велосипед
    TRANSIT = "TRANSIT"   # Общественный транспорт

class RouteOptimizationRequest(BaseModel):
    """Запрос на оптимизацию маршрута"""
    partner_location_ids: List[int] = Field(
        ..., 
        min_items=2, 
        description="Список ID локаций партнеров"
    )
    start_location_id: Optional[int] = Field(
        None, 
        description="Начальная точка маршрута (опционально)"
    )

class RouteRequest(BaseModel):
    """Запрос на построение маршрута"""
    partner_location_ids: List[int] = Field(
        ..., 
        min_items=2, 
        description="Список ID локаций партнеров"
    )
    transport_mode: Optional[TransportMode] = Field(
        default=TransportMode.DRIVING, 
        description="Режим передвижения"
    )
    optimize_route: bool = Field(
        default=True, 
        description="Оптимизировать порядок локаций"
    )

class RoutePointResponse(BaseModel):
    """Точка маршрута"""
    start: Dict[str, float]
    end: Dict[str, float]
    distance: str
    duration: Optional[str] = None

class RouteResponse(BaseModel):
    """Ответ с информацией о маршруте"""
    total_distance: str
    estimated_time: str
    route_points: List[RoutePointResponse]

class RouteNavigationRequest(BaseModel):
    """Запрос на навигацию"""
    start_latitude: float = Field(..., ge=-90, le=90)
    start_longitude: float = Field(..., ge=-180, le=180)
    end_latitude: float = Field(..., ge=-90, le=90)
    end_longitude: float = Field(..., ge=-180, le=180)
    transport_mode: Optional[TransportMode] = TransportMode.DRIVING
