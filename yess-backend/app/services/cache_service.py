from redis import Redis, ConnectionPool
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
from typing import Any, Optional, Callable
import json
import hashlib
import logging
from functools import wraps
from app.core.config import settings
import os

logger = logging.getLogger(__name__)

class CacheService:
    """
    Оптимизированный сервис кэширования с connection pooling для высокой нагрузки (4000+ пользователей)
    """
    def __init__(self, redis_host: str = None, redis_port: int = 6379, redis_url: str = None):
        self.default_expiry = 3600  # 1 час по умолчанию
        
        # Получаем настройки из переменных окружения
        MAX_CONNECTIONS = int(os.getenv("REDIS_MAX_CONNECTIONS", 150))  # Увеличено для высокой нагрузки
        
        # Конфигурация connection pool для лучшей производительности при высокой нагрузке
        redis_url = redis_url or str(settings.REDIS_URL) if hasattr(settings, 'REDIS_URL') else None
        
        if redis_url:
            self.pool = ConnectionPool.from_url(
                redis_url,
                max_connections=MAX_CONNECTIONS,  # Увеличенный пул для 4000+ пользователей
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                socket_keepalive=True,  # Поддержание соединений
                socket_keepalive_options={}  # Опции keepalive
            )
        else:
            redis_host = redis_host or getattr(settings, 'REDIS_HOST', 'redis')
            self.pool = ConnectionPool(
                host=redis_host,
                port=redis_port,
                max_connections=MAX_CONNECTIONS,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
        
        self.redis = Redis(connection_pool=self.pool)

    def _safe_operation(self, operation: Callable, default: Any = None):
        """Безопасное выполнение операций с Redis с обработкой ошибок"""
        try:
            return operation()
        except (RedisError, RedisConnectionError) as e:
            logger.error(f"Redis operation failed: {e}")
            return default
        except Exception as e:
            logger.error(f"Unexpected error in cache operation: {e}")
            return default

    def set(self, key: str, value: Any, expiry: Optional[int] = None):
        """Установка значения в кэш"""
        expiry = expiry or self.default_expiry
        return self._safe_operation(
            lambda: self.redis.setex(
                key,
                expiry,
                json.dumps(value, default=str)  # Поддержка различных типов
            ),
            False
        )

    def get(self, key: str) -> Optional[Any]:
        """Получение значения из кэша"""
        cached_value = self._safe_operation(lambda: self.redis.get(key))
        if cached_value:
            try:
                return json.loads(cached_value)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode cached value for key: {key}")
                return None
        return None

    def delete(self, key: str):
        """Удаление ключа из кэша"""
        return self._safe_operation(lambda: self.redis.delete(key), False)

    def delete_pattern(self, pattern: str):
        """Удаление всех ключей по паттерну"""
        return self._safe_operation(
            lambda: self.redis.delete(*self.redis.keys(pattern)),
            False
        )

    def clear_cache(self):
        """Очистка всего кэша"""
        return self._safe_operation(lambda: self.redis.flushdb(), False)

    def get_or_set(self, key: str, fetch_func: Callable, expiry: Optional[int] = None) -> Any:
        """Получить из кэша или установить значение через функцию"""
        cached = self.get(key)
        if cached is not None:
            return cached
        
        value = fetch_func()
        self.set(key, value, expiry)
        return value

    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Увеличить значение (для счетчиков)"""
        return self._safe_operation(
            lambda: self.redis.incrby(key, amount),
            None
        )

    def expire(self, key: str, seconds: int):
        """Установить TTL для ключа"""
        return self._safe_operation(
            lambda: self.redis.expire(key, seconds),
            False
        )

    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Генерация уникального ключа кэша"""
        key_parts = [func_name]
        if args:
            key_parts.append(str(hash(args)))
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            key_parts.append(str(hash(tuple(sorted_kwargs))))
        key_string = ":".join(key_parts)
        return f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"

    def cache_method(self, expiry: Optional[int] = None):
        """Декоратор для кэширования результатов функций"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self._generate_cache_key(func.__name__, args, kwargs)
                cached_result = self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                result = func(*args, **kwargs)
                self.set(cache_key, result, expiry)
                return result
            return wrapper
        return decorator

    def health_check(self) -> bool:
        """Проверка работоспособности Redis"""
        try:
            return self.redis.ping()
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    def get_pool_stats(self) -> dict:
        """Получение статистики пула соединений"""
        try:
            pool = self.pool
            return {
                "created_connections": pool.created_connections if hasattr(pool, 'created_connections') else 0,
                "available_connections": len(pool._available_connections) if hasattr(pool, '_available_connections') else 0,
                "max_connections": pool.max_connections if hasattr(pool, 'max_connections') else 0
            }
        except Exception as e:
            logger.error(f"Failed to get pool stats: {e}")
            return {}

# Глобальный экземпляр сервиса кэширования
cache_service = CacheService()
