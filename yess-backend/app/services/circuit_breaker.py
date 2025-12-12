"""
Circuit Breaker для защиты от падения внешних сервисов
"""
import time
import logging
from typing import Callable, Optional, Any
from functools import wraps
from enum import Enum
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Состояния Circuit Breaker"""
    CLOSED = "closed"  # Нормальная работа
    OPEN = "open"  # Сервис недоступен, запросы блокируются
    HALF_OPEN = "half_open"  # Тестирование восстановления


class CircuitBreaker:
    """
    Circuit Breaker паттерн для защиты от каскадных отказов
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "circuit_breaker"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        
        # Восстановление состояния из кэша при инициализации
        self._restore_state()
    
    def _get_state_key(self, suffix: str) -> str:
        """Генерация ключа для хранения состояния"""
        return f"circuit_breaker:{self.name}:{suffix}"
    
    def _save_state(self):
        """Сохранение состояния в кэш"""
        if cache_service and cache_service.health_check():
            try:
                cache_service.set(
                    self._get_state_key("failure_count"),
                    self.failure_count,
                    expiry=self.recovery_timeout * 2
                )
                if self.last_failure_time:
                    cache_service.set(
                        self._get_state_key("last_failure_time"),
                        self.last_failure_time,
                        expiry=self.recovery_timeout * 2
                    )
                cache_service.set(
                    self._get_state_key("state"),
                    self.state.value,
                    expiry=self.recovery_timeout * 2
                )
            except Exception as e:
                logger.debug(f"Failed to save circuit breaker state: {e}")
    
    def _restore_state(self):
        """Восстановление состояния из кэша"""
        if cache_service and cache_service.health_check():
            try:
                cached_count = cache_service.get(self._get_state_key("failure_count"))
                cached_time = cache_service.get(self._get_state_key("last_failure_time"))
                cached_state = cache_service.get(self._get_state_key("state"))
                
                if cached_count is not None:
                    self.failure_count = cached_count
                if cached_time is not None:
                    self.last_failure_time = cached_time
                if cached_state:
                    self.state = CircuitState(cached_state)
            except Exception as e:
                logger.debug(f"Failed to restore circuit breaker state: {e}")
    
    def _record_success(self):
        """Запись успешного запроса"""
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self._save_state()
        logger.debug(f"Circuit breaker {self.name}: Success recorded")
    
    def _record_failure(self):
        """Запись неудачного запроса"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        self._save_state()
        
        logger.warning(
            f"Circuit breaker {self.name}: Failure recorded "
            f"({self.failure_count}/{self.failure_threshold})"
        )
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(
                f"Circuit breaker {self.name}: OPENED - "
                f"Too many failures ({self.failure_count})"
            )
    
    def _should_attempt_reset(self) -> bool:
        """Проверка возможности сброса (переход в HALF_OPEN)"""
        if self.state != CircuitState.OPEN:
            return False
        
        if self.last_failure_time is None:
            return True
        
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
    
    def __call__(self, func: Callable) -> Callable:
        """Декоратор для применения Circuit Breaker к функции"""
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Проверка состояния
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker {self.name}: Attempting recovery (HALF_OPEN)")
                else:
                    remaining = self.recovery_timeout - (time.time() - self.last_failure_time)
                    raise CircuitBreakerOpenError(
                        f"Circuit breaker is OPEN. Service unavailable. "
                        f"Retry after {remaining:.0f} seconds."
                    )
            
            # Выполнение функции
            try:
                result = func(*args, **kwargs)
                
                # Успешное выполнение
                if self.state == CircuitState.HALF_OPEN:
                    self._record_success()
                    logger.info(f"Circuit breaker {self.name}: Recovered successfully")
                elif self.state == CircuitState.CLOSED:
                    # Сброс счетчика при успехе
                    if self.failure_count > 0:
                        self.failure_count = max(0, self.failure_count - 1)
                        self._save_state()
                
                return result
                
            except self.expected_exception as e:
                self._record_failure()
                raise
            
            except Exception as e:
                # Неожиданные исключения не влияют на circuit breaker
                logger.error(f"Unexpected error in {self.name}: {e}")
                raise
        
        return wrapper


class CircuitBreakerOpenError(Exception):
    """Исключение, когда Circuit Breaker открыт"""
    pass


def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception,
    name: Optional[str] = None
):
    """
    Декоратор для применения Circuit Breaker
    
    Args:
        failure_threshold: Количество ошибок перед открытием
        recovery_timeout: Время в секундах перед попыткой восстановления
        expected_exception: Тип исключения, которое считается ошибкой
        name: Имя circuit breaker для логирования
    """
    def decorator(func: Callable) -> Callable:
        breaker_name = name or f"{func.__module__}.{func.__name__}"
        breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception,
            name=breaker_name
        )
        return breaker(func)
    return decorator

