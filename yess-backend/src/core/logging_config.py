import logging
import structlog
import sys
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from typing import Optional, Dict, Any

class LoggingManager:
    """Менеджер логирования с расширенной конфигурацией"""
    
    @staticmethod
    def configure_logging(
        sentry_dsn: Optional[str] = None, 
        log_level: int = logging.INFO,
        log_file: Optional[str] = 'app.log'
    ):
        """
        Настройка комплексного логирования
        
        Args:
            sentry_dsn (Optional[str]): DSN для Sentry
            log_level (int): Уровень логирования
            log_file (Optional[str]): Путь к файлу логов
        """
        # Настройка Sentry
        if sentry_dsn:
            sentry_logging = LoggingIntegration(
                level=log_level,
                event_level=logging.ERROR
            )
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[sentry_logging]
            )

        # Базовая конфигурация logging
        handlers = [logging.StreamHandler(sys.stdout)]
        if log_file:
            handlers.append(logging.FileHandler(log_file, encoding='utf-8'))

        logging.basicConfig(
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            level=log_level,
            handlers=handlers
        )

        # Конфигурация structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )

    @staticmethod
    def get_logger(name: Optional[str] = None) -> structlog.BoundLogger:
        """
        Получение логгера с поддержкой structlog
        
        Args:
            name (Optional[str]): Имя логгера
        
        Returns:
            structlog.BoundLogger: Сконфигурированный логгер
        """
        return structlog.get_logger(name)

    @staticmethod
    def log_event(
        logger: structlog.BoundLogger, 
        event_type: str, 
        message: str, 
        level: str = 'info', 
        extra: Optional[Dict[str, Any]] = None
    ):
        """
        Универсальный метод логирования событий
        
        Args:
            logger (structlog.BoundLogger): Логгер
            event_type (str): Тип события
            message (str): Сообщение
            level (str): Уровень логирования
            extra (Optional[Dict[str, Any]]): Дополнительные данные
        """
        log_method = getattr(logger, level)
        
        log_data = {
            'event_type': event_type,
            'message': message
        }
        
        if extra:
            log_data.update(extra)
        
        log_method(event_type, **log_data)

# Автоматическая инициализация при импорте
LoggingManager.configure_logging()
