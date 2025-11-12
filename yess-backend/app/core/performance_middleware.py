"""
Middleware для мониторинга производительности запросов
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import logging
from typing import Callable
from app.core.config import settings
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)

class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware для отслеживания производительности запросов
    Логирует медленные запросы и собирает метрики
    """
    
    def __init__(self, app, slow_request_threshold: float = 1.0):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Пропускаем мониторинг для служебных эндпоинтов
        if request.url.path in ['/health', '/metrics', '/docs', '/openapi.json', '/redoc']:
            return await call_next(request)
        
        start_time = time.time()
        request_id = request.headers.get('x-request-id', 'unknown')
        
        # Метрики запроса
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else 'unknown'
        
        try:
            response = await call_next(request)
            
            # Время выполнения
            duration = time.time() - start_time
            
            # Логирование медленных запросов
            if duration > self.slow_request_threshold:
                logger.warning(
                    f"Slow request detected: {method} {path} - {duration:.3f}s "
                    f"[Status: {response.status_code}] [IP: {client_ip}] [Request-ID: {request_id}]"
                )
            
            # Добавление заголовков с метриками
            response.headers["X-Process-Time"] = str(round(duration, 3))
            response.headers["X-Request-ID"] = request_id
            
            # Кэширование метрик (для аналитики)
            if cache_service and cache_service.health_check():
                try:
                    metrics_key = f"metrics:request:{path}:{method}"
                    cache_service.increment(metrics_key)
                    
                    # Сохранение времени выполнения для агрегации
                    duration_key = f"metrics:duration:{path}:{method}"
                    cache_service.set(
                        f"{duration_key}:{int(start_time)}",
                        duration,
                        expiry=3600
                    )
                except Exception as e:
                    logger.debug(f"Failed to cache metrics: {e}")
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: {method} {path} - {duration:.3f}s "
                f"[Error: {str(e)}] [IP: {client_ip}] [Request-ID: {request_id}]"
            )
            raise

    def get_metrics(self) -> dict:
        """Получение собранных метрик"""
        if not cache_service or not cache_service.health_check():
            return {}
        
        try:
            # Здесь можно добавить агрегацию метрик
            # Для полноценной реализации нужно использовать Prometheus или подобное
            return {
                "status": "active",
                "cache_status": cache_service.health_check()
            }
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {"status": "error", "message": str(e)}

