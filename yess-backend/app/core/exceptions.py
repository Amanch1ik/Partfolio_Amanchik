from fastapi import status
from typing import Optional, Any, Dict


class YESSBaseException(Exception):
    """Базовое исключение для всех ошибок в системе"""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationException(YESSBaseException):
    """Исключения, связанные с аутентификацией"""
    def __init__(
        self,
        message: str = "Ошибка аутентификации",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class PermissionDeniedException(YESSBaseException):
    """Исключения, связанные с правами доступа"""
    def __init__(
        self,
        message: str = "Недостаточно прав",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class ResourceNotFoundException(YESSBaseException):
    """Исключения при отсутствии ресурса"""
    def __init__(
        self,
        resource: str,
        details: Optional[Dict[str, Any]] = None
    ):
        message = f"Ресурс '{resource}' не найден"
        super().__init__(
            message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class ValidationException(YESSBaseException):
    """Ошибка валидации входных данных"""
    def __init__(
        self,
        message: str = "Ошибка валидации данных",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class RateLimitException(YESSBaseException):
    """Превышен лимит запросов"""
    def __init__(
        self,
        message: str = "Превышен лимит запросов",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details
        )


class ExternalServiceException(YESSBaseException):
    """Ошибка внешнего сервиса (API, интеграции и т.д.)"""
    def __init__(
        self,
        message: str = "Ошибка при обращении к внешнему сервису",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )


class NotFoundException(ResourceNotFoundException):
    """Обратная совместимость — старый код ожидает класс NotFoundException"""
    def __init__(
        self,
        resource: str = "Объект",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(resource, details)


def global_exception_handler(exc: Exception):
    """Глобальный обработчик исключений"""
    if isinstance(exc, YESSBaseException):
        return {
            "error": True,
            "message": exc.message,
            "details": exc.details
        }, exc.status_code

    # Неизвестные исключения
    return {
        "error": True,
        "message": "Внутренняя ошибка сервера",
        "details": str(exc)
    }, status.HTTP_500_INTERNAL_SERVER_ERROR
