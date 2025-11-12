import math
import asyncio
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_
from math import radians, sin, cos, sqrt, atan2
from functools import lru_cache
import requests
import logging

from app.core.cache import redis_cache
from app.models.partner import Partner, PartnerLocation
from app.schemas.partner import (
    PartnerLocationResponse, 
    NearbyPartnerRequest, 
    RouteRequest, 
    RouteResponse,
    LocationUpdateRequest,
    PartnerFilterRequest
)
from app.core.exceptions import NotFoundException, ExternalServiceException

logger = logging.getLogger(__name__)

class PartnerCategory(Enum):
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    BEAUTY = "beauty"
    FITNESS = "fitness"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    EDUCATION = "education"

@dataclass
class Location:
    latitude: float
    longitude: float
    address: str
    city: str
    country: str = "Kyrgyzstan"

@dataclass
class Partner:
    id: int
    name: str
    category: PartnerCategory
    location: Location
    rating: float
    distance: Optional[float] = None
    is_open: bool = True
    discount_percent: float = 0.0

class GeolocationService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.earth_radius = 6371  # Радиус Земли в километрах
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Расчет расстояния между двумя точками по формуле Haversine
        """
        # Преобразование в радианы
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Разности координат
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Формула Haversine
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return self.earth_radius * c
    
    def find_nearby_partners(
        self, 
        user_lat: float, 
        user_lon: float, 
        radius_km: float = 5.0,
        category: Optional[PartnerCategory] = None,
        limit: int = 50
    ) -> List[Partner]:
        """
        Поиск партнеров поблизости
        """
        try:
            # Базовый запрос
            base_query = """
                SELECT 
                    p.id,
                    p.name,
                    p.category,
                    p.latitude,
                    p.longitude,
                    p.address,
                    p.city,
                    p.rating,
                    p.is_open,
                    p.discount_percent,
                    (
                        6371 * acos(
                            cos(radians(:user_lat)) * cos(radians(p.latitude)) * 
                            cos(radians(p.longitude) - radians(:user_lon)) + 
                            sin(radians(:user_lat)) * sin(radians(p.latitude))
                        )
                    ) AS distance
                FROM partners p
                WHERE p.is_active = true
                AND (
                    6371 * acos(
                        cos(radians(:user_lat)) * cos(radians(p.latitude)) * 
                        cos(radians(p.longitude) - radians(:user_lon)) + 
                        sin(radians(:user_lat)) * sin(radians(p.latitude))
                    )
                ) <= :radius_km
            """
            
            params = {
                'user_lat': user_lat,
                'user_lon': user_lon,
                'radius_km': radius_km
            }
            
            # Добавление фильтра по категории
            if category:
                base_query += " AND p.category = :category"
                params['category'] = category.value
            
            # Сортировка по расстоянию и лимит
            base_query += " ORDER BY distance ASC LIMIT :limit"
            params['limit'] = limit
            
            query = text(base_query)
            results = self.db.execute(query, params).fetchall()
            
            partners = []
            for row in results:
                partner = Partner(
                    id=row[0],
                    name=row[1],
                    category=PartnerCategory(row[2]),
                    location=Location(
                        latitude=row[3],
                        longitude=row[4],
                        address=row[5],
                        city=row[6]
                    ),
                    rating=float(row[7]),
                    distance=float(row[10]),
                    is_open=row[8],
                    discount_percent=float(row[9])
                )
                partners.append(partner)
            
            return partners
            
        except Exception as e:
            logger.error(f"Error finding nearby partners: {e}")
            return []
    
    def get_partners_by_category(
        self, 
        category: PartnerCategory, 
        city: Optional[str] = None,
        limit: int = 100
    ) -> List[Partner]:
        """
        Получение партнеров по категории
        """
        try:
            query = text("""
                SELECT 
                    p.id,
                    p.name,
                    p.category,
                    p.latitude,
                    p.longitude,
                    p.address,
                    p.city,
                    p.rating,
                    p.is_open,
                    p.discount_percent
                FROM partners p
                WHERE p.category = :category AND p.is_active = true
            """)
            
            params = {'category': category.value}
            
            if city:
                query = text(str(query) + " AND p.city = :city")
                params['city'] = city
            
            query = text(str(query) + " ORDER BY p.rating DESC LIMIT :limit")
            params['limit'] = limit
            
            results = self.db.execute(query, params).fetchall()
            
            partners = []
            for row in results:
                partner = Partner(
                    id=row[0],
                    name=row[1],
                    category=PartnerCategory(row[2]),
                    location=Location(
                        latitude=row[3],
                        longitude=row[4],
                        address=row[5],
                        city=row[6]
                    ),
                    rating=float(row[7]),
                    is_open=row[8],
                    discount_percent=float(row[9])
                )
                partners.append(partner)
            
            return partners
            
        except Exception as e:
            logger.error(f"Error getting partners by category: {e}")
            return []
    
    def get_route_to_partner(
        self, 
        user_lat: float, 
        user_lon: float, 
        partner_id: int
    ) -> Dict:
        """
        Получение маршрута до партнера
        """
        try:
            # Получение координат партнера
            query = text("""
                SELECT latitude, longitude, name, address
                FROM partners 
                WHERE id = :partner_id AND is_active = true
            """)
            
            result = self.db.execute(query, {'partner_id': partner_id}).fetchone()
            
            if not result:
                return {"error": "Partner not found"}
            
            partner_lat, partner_lon, partner_name, partner_address = result
            
            # Расчет расстояния
            distance = self.calculate_distance(user_lat, user_lon, partner_lat, partner_lon)
            
            # Примерное время в пути (средняя скорость 30 км/ч в городе)
            estimated_time = (distance / 30) * 60  # в минутах
            
            return {
                "partner_id": partner_id,
                "partner_name": partner_name,
                "partner_address": partner_address,
                "distance_km": round(distance, 2),
                "estimated_time_minutes": round(estimated_time),
                "route_coordinates": {
                    "start": {"lat": user_lat, "lon": user_lon},
                    "end": {"lat": partner_lat, "lon": partner_lon}
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting route to partner: {e}")
            return {"error": "Failed to get route"}
    
    def get_city_partners(self, city: str) -> Dict[str, List[Partner]]:
        """
        Получение всех партнеров города, сгруппированных по категориям
        """
        try:
            partners_by_category = {}
            
            for category in PartnerCategory:
                partners = self.get_partners_by_category(category, city)
                if partners:
                    partners_by_category[category.value] = partners
            
            return partners_by_category
            
        except Exception as e:
            logger.error(f"Error getting city partners: {e}")
            return {}
    
    def search_partners(
        self, 
        query: str, 
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        radius_km: float = 10.0,
        limit: int = 50
    ) -> List[Partner]:
        """
        Поиск партнеров по названию или описанию
        """
        try:
            base_query = """
                SELECT 
                    p.id,
                    p.name,
                    p.category,
                    p.latitude,
                    p.longitude,
                    p.address,
                    p.city,
                    p.rating,
                    p.is_open,
                    p.discount_percent
                FROM partners p
                WHERE p.is_active = true
                AND (
                    LOWER(p.name) LIKE LOWER(:search_query)
                    OR LOWER(p.description) LIKE LOWER(:search_query)
                    OR LOWER(p.address) LIKE LOWER(:search_query)
                )
            """
            
            params = {'search_query': f'%{query}%'}
            
            # Если указаны координаты пользователя, добавляем фильтр по расстоянию
            if user_lat and user_lon:
                base_query += """
                    AND (
                        6371 * acos(
                            cos(radians(:user_lat)) * cos(radians(p.latitude)) * 
                            cos(radians(p.longitude) - radians(:user_lon)) + 
                            sin(radians(:user_lat)) * sin(radians(p.latitude))
                        )
                    ) <= :radius_km
                """
                params.update({
                    'user_lat': user_lat,
                    'user_lon': user_lon,
                    'radius_km': radius_km
                })
            
            base_query += " ORDER BY p.rating DESC LIMIT :limit"
            params['limit'] = limit
            
            sql_query = text(base_query)
            results = self.db.execute(sql_query, params).fetchall()
            
            partners = []
            for row in results:
                partner = Partner(
                    id=row[0],
                    name=row[1],
                    category=PartnerCategory(row[2]),
                    location=Location(
                        latitude=row[3],
                        longitude=row[4],
                        address=row[5],
                        city=row[6]
                    ),
                    rating=float(row[7]),
                    is_open=row[8],
                    discount_percent=float(row[9])
                )
                
                # Расчет расстояния если указаны координаты пользователя
                if user_lat and user_lon:
                    partner.distance = self.calculate_distance(
                        user_lat, user_lon, partner.location.latitude, partner.location.longitude
                    )
                
                partners.append(partner)
            
            return partners
            
        except Exception as e:
            logger.error(f"Error searching partners: {e}")
            return []

    @classmethod
    @lru_cache(maxsize=1000)
    def calculate_distance(
        cls, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """
        Кэшированное вычисление расстояния с использованием формулы Хаверсина
        """
        R = 6371  # Радиус Земли в километрах
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c

    @classmethod
    def find_nearby_partners(
        cls, 
        db: Session, 
        request: NearbyPartnerRequest,
        filter_request: Optional[PartnerFilterRequest] = None
    ) -> List[PartnerLocationResponse]:
        """
        Оптимизированный поиск ближайших партнеров с расширенной фильтрацией
        """
        # Кэш-ключ для запроса
        cache_key = f"nearby_partners:{request.latitude}:{request.longitude}:{request.radius}"
        
        # Попытка получить из кэша
        cached_result = redis_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Базовый запрос с пространственным поиском
        query = db.query(PartnerLocation).filter(
            func.ST_DWithin(
                PartnerLocation.geom, 
                func.ST_MakePoint(request.longitude, request.latitude),
                request.radius * 1000  # Перевод в метры
            )
        )
        
        # Дополнительная фильтрация
        if filter_request:
            if filter_request.categories:
                query = query.filter(
                    Partner.category.in_(filter_request.categories)
                )
            
            if filter_request.min_cashback:
                query = query.filter(
                    Partner.default_cashback_rate >= filter_request.min_cashback
                )
            
            if filter_request.is_verified:
                query = query.filter(Partner.is_verified == True)
        
        # Выполнение запроса
        nearby_locations = query.all()
        
        # Сортировка по расстоянию
        nearby_locations.sort(
            key=lambda loc: cls.calculate_distance(
                request.latitude, request.longitude, 
                loc.latitude, loc.longitude
            )
        )
        
        # Преобразование в ответ
        result = [
            PartnerLocationResponse(
                id=loc.id,
                partner_id=loc.partner_id,
                partner_name=loc.partner.name,
                address=loc.address,
                latitude=loc.latitude,
                longitude=loc.longitude,
                phone_number=loc.phone_number,
                working_hours=loc.working_hours,
                max_discount_percent=loc.partner.default_cashback_rate
            ) for loc in nearby_locations
        ]
        
        # Кэширование результата
        redis_cache.set(cache_key, result, expire=cls.CACHE_EXPIRATION)
        
        return result

    @classmethod
    def build_route(
        cls, 
        db: Session, 
        request: RouteRequest
    ) -> Dict[str, Any]:
        """
        Построение маршрута между точками
        
        :param db: SQLAlchemy сессия
        :param request: Параметры маршрута
        :return: Информация о маршруте
        """
        # Получаем локации партнеров
        locations = db.query(PartnerLocation).filter(
            PartnerLocation.id.in_(request.partner_location_ids)
        ).all()
        
        if len(locations) != len(request.partner_location_ids):
            raise NotFoundException("Одна или несколько локаций не найдены")
        
        # Сортировка локаций по порядку в запросе
        sorted_locations = sorted(
            locations, 
            key=lambda loc: request.partner_location_ids.index(loc.id)
        )
        
        # Расчет маршрута
        route_points = []
        total_distance = 0
        
        for i in range(len(sorted_locations) - 1):
            start = sorted_locations[i]
            end = sorted_locations[i + 1]
            
            distance = cls.calculate_distance(
                start.latitude, start.longitude,
                end.latitude, end.longitude
            )
            
            route_points.append({
                'start': {
                    'name': start.partner.name,
                    'address': start.address,
                    'latitude': start.latitude,
                    'longitude': start.longitude
                },
                'end': {
                    'name': end.partner.name,
                    'address': end.address,
                    'latitude': end.latitude,
                    'longitude': end.longitude
                },
                'distance': round(distance, 2)
            })
            
            total_distance += distance
        
        return {
            'route_points': route_points,
            'total_distance': round(total_distance, 2),
            'estimated_time': round(total_distance / 50 * 60)  # Примерное время в минутах
        }

    @classmethod
    def build_route_with_maps(
        cls, 
        db: Session, 
        request: RouteRequest,
        map_provider: str = 'google'
    ) -> Dict[str, Any]:
        """
        Построение маршрута с использованием Google/Apple Maps
        """
        # Получаем локации партнеров
        locations = db.query(PartnerLocation).filter(
            PartnerLocation.id.in_(request.partner_location_ids)
        ).all()
        
        if len(locations) != len(request.partner_location_ids):
            raise NotFoundException("Одна или несколько локаций не найдены")
        
        # Сортировка локаций по порядку в запросе
        sorted_locations = sorted(
            locations, 
            key=lambda loc: request.partner_location_ids.index(loc.id)
        )
        
        # Подготовка координат для API
        waypoints = [
            f"{loc.latitude},{loc.longitude}" for loc in sorted_locations[1:-1]
        ]
        
        try:
            if map_provider == 'google':
                route = cls._get_google_maps_route(
                    origin=f"{sorted_locations[0].latitude},{sorted_locations[0].longitude}",
                    destination=f"{sorted_locations[-1].latitude},{sorted_locations[-1].longitude}",
                    waypoints=waypoints
                )
            elif map_provider == 'apple':
                route = cls._get_apple_maps_route(
                    origin=f"{sorted_locations[0].latitude},{sorted_locations[0].longitude}",
                    destination=f"{sorted_locations[-1].latitude},{sorted_locations[-1].longitude}",
                    waypoints=waypoints
                )
            else:
                raise ValueError("Неподдерживаемый провайдер карт")
            
            return route
        
        except Exception as e:
            logger.error(f"Ошибка построения маршрута: {e}")
            raise ExternalServiceException("Не удалось построить маршрут")

    @classmethod
    def _get_google_maps_route(
        cls, 
        origin: str, 
        destination: str, 
        waypoints: List[str]
    ) -> Dict[str, Any]:
        """
        Получение маршрута через Google Maps API
        """
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": origin,
            "destination": destination,
            "waypoints": "|".join(waypoints),
            "key": cls.GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data['status'] != 'OK':
            raise ExternalServiceException("Ошибка Google Maps API")
        
        return {
            "route_points": [
                {
                    "start": leg['start_location'],
                    "end": leg['end_location'],
                    "distance": leg['distance']['text'],
                    "duration": leg['duration']['text']
                } for leg in data['routes'][0]['legs']
            ],
            "total_distance": data['routes'][0]['legs'][-1]['distance']['text'],
            "estimated_time": data['routes'][0]['legs'][-1]['duration']['text']
        }

    @classmethod
    def _get_apple_maps_route(
        cls, 
        origin: str, 
        destination: str, 
        waypoints: List[str]
    ) -> Dict[str, Any]:
        """
        Получение маршрута через Apple Maps API
        """
        # Заглушка - реальная реализация потребует специфичного API Apple
        return {
            "route_points": [],
            "total_distance": "0 km",
            "estimated_time": "0 min"
        }

    @classmethod
    def optimize_route(
        cls, 
        db: Session, 
        partner_location_ids: List[int]
    ) -> List[int]:
        """
        Оптимизация порядка посещения партнеров
        Используется алгоритм ближайшего соседа
        """
        locations = db.query(PartnerLocation).filter(
            PartnerLocation.id.in_(partner_location_ids)
        ).all()
        
        # Начальная точка - первая локация
        start_location = locations[0]
        unvisited = set(loc.id for loc in locations[1:])
        optimized_route = [start_location.id]
        
        while unvisited:
            current = optimized_route[-1]
            current_location = next(loc for loc in locations if loc.id == current)
            
            # Найти ближайшую непосещенную локацию
            nearest = min(
                [loc for loc in locations if loc.id in unvisited],
                key=lambda loc: cls.calculate_distance(
                    current_location.latitude, current_location.longitude,
                    loc.latitude, loc.longitude
                )
            )
            
            optimized_route.append(nearest.id)
            unvisited.remove(nearest.id)
        
        return optimized_route

    @classmethod
    def update_partner_location(
        cls, 
        db: Session, 
        partner_id: int, 
        latitude: float, 
        longitude: float
    ) -> PartnerLocation:
        """
        Обновление геолокации партнера
        
        :param db: SQLAlchemy сессия
        :param partner_id: ID партнера
        :param latitude: Широта
        :param longitude: Долгота
        :return: Обновленная локация
        """
        # Находим основную локацию партнера
        location = db.query(PartnerLocation).filter(
            PartnerLocation.partner_id == partner_id,
            PartnerLocation.is_main_location == True
        ).first()
        
        if not location:
            # Создаем новую локацию, если не существует
            location = PartnerLocation(
                partner_id=partner_id,
                is_main_location=True
            )
            db.add(location)
        
        # Обновляем координаты
        location.latitude = latitude
        location.longitude = longitude
        
        # Создаем точку для пространственных запросов
        location.geom = text(f"ST_MakePoint({longitude}, {latitude})")
        
        # Обновляем координаты основного партнера
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        partner.latitude = latitude
        partner.longitude = longitude
        partner.geom = text(f"ST_MakePoint({longitude}, {latitude})")
        
        db.commit()
        db.refresh(location)
        
        return location
