from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import os
from typing import Dict
from app.core.config import settings

class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.ip_attempts: Dict[str, Dict] = {}
        self.max_attempts = 10  # Увеличено для разработки
        self.block_duration = 300  # 5 минут вместо 1 часа
        
        # Whitelist IP для разработки (localhost всегда разрешен)
        self.whitelist_ips = [
            "127.0.0.1",
            "localhost",
            "::1",
            "0.0.0.0"
        ]
        
        # В режиме разработки отключаем блокировку для localhost
        self.development_mode = settings.DEVELOPMENT_MODE or os.getenv("ENVIRONMENT", "development") == "development"
        
        # Публичные пути, которые не должны блокироваться
        self.public_paths = [
            "/health",
            "/health/db",
            "/health/cache",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        
        # Пропускаем OPTIONS запросы (CORS preflight) - КРИТИЧНО для CORS
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Пропускаем публичные эндпоинты
        if any(request.url.path.startswith(path) for path in self.public_paths):
            return await call_next(request)

        # В режиме разработки пропускаем localhost без проверки
        # Также проверяем, что IP начинается с 127 или localhost
        if self.development_mode:
            if (client_ip in self.whitelist_ips or 
                client_ip.startswith("127.") or 
                client_ip.startswith("::1") or
                "localhost" in str(client_ip).lower()):
                return await call_next(request)

        # Проверка блокировки IP (только в продакшене)
        if not self.development_mode and self._is_ip_blocked(client_ip):
            raise HTTPException(status_code=403, detail="IP temporarily blocked")

        response = await call_next(request)
        
        # Отслеживаем только НЕУДАЧНЫЕ попытки (401, 403, 500)
        # При успешных запросах (200, 201) сбрасываем счетчик
        if response.status_code >= 400:
            self._track_ip_attempt(client_ip)
        elif response.status_code < 300:
            # Успешный запрос - сбрасываем счетчик
            self._reset_ip_attempts(client_ip)
        
        return response

    def _is_ip_blocked(self, ip: str) -> bool:
        if ip not in self.ip_attempts:
            return False
        
        attempt_data = self.ip_attempts[ip]
        return (
            attempt_data['attempts'] >= self.max_attempts and
            time.time() - attempt_data['first_attempt'] < self.block_duration
        )

    def _track_ip_attempt(self, ip: str):
        current_time = time.time()
        
        if ip not in self.ip_attempts:
            self.ip_attempts[ip] = {
                'attempts': 1,
                'first_attempt': current_time
            }
        else:
            attempt_data = self.ip_attempts[ip]
            
            # Сброс счетчика, если время блокировки истекло
            if current_time - attempt_data['first_attempt'] > self.block_duration:
                attempt_data['attempts'] = 1
                attempt_data['first_attempt'] = current_time
            else:
                attempt_data['attempts'] += 1

    def _reset_ip_attempts(self, ip: str):
        """Сброс счетчика попыток для IP (при успешном запросе)"""
        if ip in self.ip_attempts:
            del self.ip_attempts[ip]

    def clear_old_attempts(self):
        """Очистка старых попыток входа"""
        current_time = time.time()
        self.ip_attempts = {
            ip: data for ip, data in self.ip_attempts.items()
            if current_time - data['first_attempt'] < self.block_duration
        }
