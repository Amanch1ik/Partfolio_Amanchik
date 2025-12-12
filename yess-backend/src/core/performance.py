from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from redis import Redis
from functools import lru_cache, wraps
import time
from typing import Callable, Any, Optional

class PerformanceManager:
    """Менеджер производительности с расширенными возможностями"""
    
    def __init__(
        self, 
        database_url: str, 
        redis_host: str = 'localhost', 
        redis_port: int = 6379
    ):
        """
        Инициализация менеджера производительности
        
        Args:
            database_url (str): URL подключения к базе данных
            redis_host (str): Хост Redis
            redis_port (int): Порт Redis
        """
        self.engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=20,  # Размер пула соединений
            max_overflow=10,  # Максимальное число дополнительных соединений
            pool_timeout=30,  # Время ожидания соединения
            pool_recycle=1800,  # Обновление соединений каждые 30 минут
        )
        
        self.SessionLocal = scoped_session(sessionmaker(
            bind=self.engine, 
            autocommit=False, 
            autoflush=False
        ))
        
        self.redis_client = Redis(
            host=redis_host, 
            port=redis_port, 
            db=0, 
            max_connections=20
        )

    def get_session(self):
        """
        Получение сессии базы данных
        
        Returns:
            Session: Сессия SQLAlchemy
        """
        return self.SessionLocal()

    def cache_query(
        self, 
        key: str, 
        query_func: Callable[[], Any], 
        timeout: int = 300
    ) -> Any:
        """
        Кэширование результатов запросов
        
        Args:
            key (str): Ключ кэша
            query_func (Callable[[], Any]): Функция для выполнения запроса
            timeout (int): Время жизни кэша в секундах
        
        Returns:
            Any: Результат запроса
        """
        cached_result = self.redis_client.get(key)
        if cached_result:
            return cached_result

        result = query_func()
        self.redis_client.setex(key, timeout, result)
        return result

    @staticmethod
    def performance_tracker(
        logger=None, 
        log_slow_queries: bool = True, 
        slow_query_threshold: float = 0.5
    ):
        """
        Декоратор для трекинга производительности функций
        
        Args:
            logger: Логгер для записи информации о производительности
            log_slow_queries (bool): Логировать медленные запросы
            slow_query_threshold (float): Порог времени выполнения для медленных запросов
        
        Returns:
            Callable: Декоратор для измерения производительности
        """
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                if log_slow_queries and execution_time > slow_query_threshold and logger:
                    logger.warning(
                        "Slow query detected", 
                        function=func.__name__, 
                        execution_time=execution_time
                    )

                return result
            return wrapper
        return decorator

    def clear_cache(self, key: Optional[str] = None):
        """
        Очистка кэша
        
        Args:
            key (Optional[str]): Ключ для удаления. Если None, очищается весь кэш
        """
        if key:
            self.redis_client.delete(key)
        else:
            self.redis_client.flushdb()
