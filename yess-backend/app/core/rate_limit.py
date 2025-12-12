"""
Rate Limiting Middleware
Защита от DDoS и злоупотреблений
"""
import time
import logging
from typing import Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import get_settings  # ✅ Импортируем функцию, а не объект

logger = logging.getLogger(__name__)

# ✅ Инициализируем настройки корректно
settings = get_settings()

# Инициализация SlowAPI limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        f"{settings.RATE_LIMIT_PER_MINUTE}/minute",
        f"{settings.RATE_LIMIT_PER_HOUR}/hour"
    ],
    enabled=settings.RATE_LIMIT_ENABLED
)

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Обработчик превышения лимита"""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Слишком много запросов. Пожалуйста, подождите.",
            "retry_after": str(exc.detail)
        }
    )


class RateLimitMiddleware:
    """Middleware для проверки rate limits"""

    def __init__(self, app):
        self.app = app

    def _is_excluded_path(self, path: str) -> bool:
        """Пути, исключённые из rate limiting"""
        excluded = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics"
        ]
        return any(path.startswith(p) for p in excluded)
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        
        # Пропускаем OPTIONS запросы (CORS preflight)
        if request.method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # Пропускаем проверку для некоторых эндпоинтов
        if self._is_excluded_path(request.url.path):
            await self.app(scope, receive, send)
            return

        # Проверяем rate limit
        if not await self._check_rate_limit(request):
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Слишком много запросов"
                }
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)

    async def _check_rate_limit(self, request: Request) -> bool:
        """Проверка лимита (упрощённая версия)"""
        # В реальном приложении используйте Redis для хранения счётчиков
        return True


# Декораторы для разных уровней лимитов

def strict_rate_limit():
    """Строгий лимит для чувствительных операций"""
    return limiter.limit("10/minute")


def auth_rate_limit():
    """Лимит для авторизации"""
    return limiter.limit("5/minute")


def upload_rate_limit():
    """Лимит для загрузки файлов"""
    return limiter.limit("20/hour")
