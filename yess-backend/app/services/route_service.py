import requests
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from geopy.distance import geodesic

from app.models.partner import PartnerLocation
from app.schemas.route import (
    RouteRequest, 
    RouteResponse, 
    RouteOptimizationRequest,
    TransportMode
)
from app.core.config import settings
from app.core.exceptions import ExternalServiceException

logger = logging.getLogger(__name__)

class RouteService:
    GOOGLE_MAPS_API_URL = "https://maps.googleapis.com/maps/api/directions/json"
    MAPBOX_API_URL = "https://api.mapbox.com/directions/v5/mapbox"

    @classmethod
    def calculate_route(
        cls, 
        db: Session, 
        request: RouteRequest
    ) -> RouteResponse:
        """
        Построение маршрута между партнерами
        Поддерживает несколько провайдеров карт
        """
        try:
            # Получаем локации партнеров
            locations = db.query(PartnerLocation).filter(
                PartnerLocation.id.in_(request.partner_location_ids)
            ).all()

            if len(locations) < 2:
                raise ValueError("Требуется минимум две локации для построения маршрута")

            # Оптимизация порядка локаций
            optimized_locations = cls._optimize_route_order(locations)

            # Выбор провайдера карт
            route_data = cls._get_route_from_provider(
                locations=optimized_locations, 
                mode=request.transport_mode or TransportMode.DRIVING
            )

            return RouteResponse(**route_data)

        except Exception as e:
            logger.error(f"Route calculation error: {e}")
            raise ExternalServiceException(f"Не удалось построить маршрут: {e}")

    @classmethod
    def _get_route_from_provider(
        cls, 
        locations: List[PartnerLocation], 
        mode: TransportMode = TransportMode.DRIVING
    ) -> Dict[str, Any]:
        """
        Получение маршрута от провайдера карт
        Приоритет: Google Maps → Mapbox → Fallback расчет
        """
        try:
            # Попытка использовать Google Maps
            if settings.GOOGLE_MAPS_API_KEY:
                return cls._get_google_maps_route(locations, mode)
            
            # Fallback на Mapbox
            if settings.MAPBOX_API_KEY:
                return cls._get_mapbox_route(locations, mode)
            
            # Fallback на простой расчет расстояния
            return cls._calculate_simple_route(locations)

        except Exception as e:
            logger.warning(f"Map provider route failed: {e}")
            return cls._calculate_simple_route(locations)

    @classmethod
    def _get_google_maps_route(
        cls, 
        locations: List[PartnerLocation], 
        mode: TransportMode
    ) -> Dict[str, Any]:
        """Получение маршрута через Google Maps API"""
        waypoints = [
            f"{loc.latitude},{loc.longitude}" for loc in locations[1:-1]
        ]

        params = {
            "origin": f"{locations[0].latitude},{locations[0].longitude}",
            "destination": f"{locations[-1].latitude},{locations[-1].longitude}",
            "waypoints": "|".join(waypoints),
            "mode": mode.value.lower(),
            "key": settings.GOOGLE_MAPS_API_KEY
        }

        response = requests.get(cls.GOOGLE_MAPS_API_URL, params=params)
        data = response.json()

        if data['status'] != 'OK':
            raise ExternalServiceException("Ошибка Google Maps API")

        route = data['routes'][0]
        return {
            "total_distance": route['legs'][-1]['distance']['text'],
            "estimated_time": route['legs'][-1]['duration']['text'],
            "route_points": [
                {
                    "start": leg['start_location'],
                    "end": leg['end_location'],
                    "distance": leg['distance']['text'],
                    "duration": leg['duration']['text']
                } for leg in route['legs']
            ]
        }

    @classmethod
    def _get_mapbox_route(
        cls, 
        locations: List[PartnerLocation], 
        mode: TransportMode
    ) -> Dict[str, Any]:
        """Получение маршрута через Mapbox API"""
        coordinates = ";".join([
            f"{loc.longitude},{loc.latitude}" for loc in locations
        ])

        url = f"{cls.MAPBOX_API_URL}/{mode.value.lower()}/{coordinates}"
        params = {
            "access_token": settings.MAPBOX_API_KEY,
            "geometries": "geojson",
            "overview": "full"
        }

        response = requests.get(url, params=params)
        data = response.json()

        if data.get('code') != 'Ok':
            raise ExternalServiceException("Ошибка Mapbox API")

        return {
            "total_distance": f"{data['routes'][0]['distance'] / 1000:.2f} km",
            "estimated_time": f"{data['routes'][0]['duration'] / 60:.0f} min",
            "route_points": []  # Можно добавить детали
        }

    @classmethod
    def _calculate_simple_route(
        cls, 
        locations: List[PartnerLocation]
    ) -> Dict[str, Any]:
        """
        Простой расчет расстояния между точками
        Используется как fallback
        """
        total_distance = 0
        route_points = []

        for i in range(len(locations) - 1):
            start = locations[i]
            end = locations[i + 1]

            distance = geodesic(
                (start.latitude, start.longitude),
                (end.latitude, end.longitude)
            ).kilometers

            total_distance += distance
            route_points.append({
                "start": {"lat": start.latitude, "lng": start.longitude},
                "end": {"lat": end.latitude, "lng": end.longitude},
                "distance": f"{distance:.2f} km"
            })

        return {
            "total_distance": f"{total_distance:.2f} km",
            "estimated_time": f"{total_distance * 10:.0f} min",  # Примерная оценка
            "route_points": route_points
        }

    @classmethod
    def _optimize_route_order(
        cls, 
        locations: List[PartnerLocation]
    ) -> List[PartnerLocation]:
        """
        Оптимизация порядка локаций
        Используется алгоритм ближайшего соседа
        """
        if len(locations) <= 2:
            return locations

        unvisited = locations[1:]
        optimized = [locations[0]]

        while unvisited:
            current = optimized[-1]
            nearest = min(
                unvisited, 
                key=lambda loc: geodesic(
                    (current.latitude, current.longitude),
                    (loc.latitude, loc.longitude)
                ).kilometers
            )
            optimized.append(nearest)
            unvisited.remove(nearest)

        return optimized

# Singleton
route_service = RouteService()
