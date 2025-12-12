"""
Redis Caching Utilities
"""
import json
import logging
from typing import Optional, Any
from redis import Redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis кэш для оптимизации запросов"""
    
    def __init__(self):
        try:
            self.redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True
            )
            # Проверяем соединение
            self.redis.ping()
            self.enabled = True
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            self.enabled = False
            self.redis = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Получение значения из кэша"""
        if not self.enabled:
            return None
        
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {str(e)}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """
        Сохранение значения в кэш
        ttl: время жизни в секундах
        """
        if not self.enabled:
            return False
        
        try:
            ttl = ttl or settings.REDIS_CACHE_TTL
            serialized = json.dumps(value)
            self.redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis set error: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Удаление из кэша"""
        if not self.enabled:
            return False
        
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error: {str(e)}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """
        Удаление всех ключей по шаблону
        Пример: 'user:*' удалит все ключи начинающиеся с 'user:'
        """
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis clear pattern error: {str(e)}")
            return 0
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Инкремент значения (для счётчиков)"""
        if not self.enabled:
            return 0
        
        try:
            return self.redis.incrby(key, amount)
        except Exception as e:
            logger.error(f"Redis increment error: {str(e)}")
            return 0
    
    # Специализированные методы для YESS
    
    async def cache_user(self, user_id: int, user_data: dict, ttl: int = 3600) -> bool:
        """Кэширование данных пользователя"""
        return await self.set(f"user:{user_id}", user_data, ttl)
    
    async def get_cached_user(self, user_id: int) -> Optional[dict]:
        """Получение данных пользователя из кэша"""
        return await self.get(f"user:{user_id}")
    
    async def cache_partner(self, partner_id: int, partner_data: dict, ttl: int = 3600) -> bool:
        """Кэширование данных партнёра"""
        return await self.set(f"partner:{partner_id}", partner_data, ttl)
    
    async def get_cached_partner(self, partner_id: int) -> Optional[dict]:
        """Получение данных партнёра из кэша"""
        return await self.get(f"partner:{partner_id}")
    
    async def cache_partners_list(self, city_id: int, partners: list, ttl: int = 1800) -> bool:
        """Кэширование списка партнёров по городу"""
        return await self.set(f"partners:city:{city_id}", partners, ttl)
    
    async def get_cached_partners_list(self, city_id: int) -> Optional[list]:
        """Получение списка партнёров из кэша"""
        return await self.get(f"partners:city:{city_id}")
    
    async def invalidate_user_cache(self, user_id: int) -> bool:
        """Очистка кэша пользователя"""
        return await self.delete(f"user:{user_id}")
    
    async def invalidate_partner_cache(self, partner_id: int) -> bool:
        """Очистка кэша партнёра"""
        return await self.delete(f"partner:{partner_id}")


# Singleton instance
redis_cache = RedisCache()

