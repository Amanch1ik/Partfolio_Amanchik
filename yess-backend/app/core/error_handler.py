"""
Улучшенная обработка ошибок и логирование
"""
import logging
import traceback
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.core.config import settings
from app.core.exceptions import YESSBaseException

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Базовое исключение приложения"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(AppException):
    """Ошибка валидации данных"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class NotFoundError(AppException):
    """Ресурс не найден"""
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, details=details)


class UnauthorizedError(AppException):
    """Ошибка авторизации"""
    def __init__(self, message: str = "Unauthorized", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, details=details)


class ForbiddenError(AppException):
    """Доступ запрещен"""
    def __init__(self, message: str = "Forbidden", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=403, details=details)


class ExternalServiceError(AppException):
    """Ошибка внешнего сервиса"""
    def __init__(self, message: str, service_name: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(f"External service error: {service_name} - {message}", status_code=503, details=details)
        self.service_name = service_name


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Обработчик исключений приложения"""
    logger.warning(
        f"Application exception: {exc.message}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details if settings.DEBUG else {}
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Обработчик HTTP исключений"""
    logger.warning(
        f"HTTP exception: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "message": exc.detail
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Общий обработчик исключений"""
    error_message = str(exc)
    error_traceback = traceback.format_exc()
    
    # Логирование ошибки
    logger.error(
        f"Unhandled exception: {error_message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "traceback": error_traceback
        },
        exc_info=True
    )
    
    # В production не показываем детали ошибки
    if settings.DEBUG:
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": error_message,
                "traceback": error_traceback
            }
        )
    else:
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": "An internal error occurred. Please try again later."
            }
        )


async def yess_exception_handler(request: Request, exc: YESSBaseException) -> JSONResponse:
    """Обработчик кастомных исключений YESS"""
    logger.warning(
        f"YESS exception: {exc.message}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details if settings.DEBUG else {}
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Обработчик ошибок SQLAlchemy"""
    logger.error(
        f"Database error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method
        },
        exc_info=True
    )
    
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=400,
            content={
                "error": "IntegrityError",
                "message": "Ошибка целостности данных. Возможно, запись уже существует.",
                "details": {"original_error": str(exc)} if settings.DEBUG else {}
            }
        )
    
    return JSONResponse(
        status_code=503,
        content={
            "error": "DatabaseError",
            "message": "Ошибка базы данных. Попробуйте позже.",
            "details": {"original_error": str(exc)} if settings.DEBUG else {}
        }
    )


def setup_error_handlers(app):
    """Настройка обработчиков ошибок для приложения"""
    # Кастомные исключения YESS
    app.add_exception_handler(YESSBaseException, yess_exception_handler)
    
    # Старые обработчики для обратной совместимости
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Обработка ошибок БД
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    
    # Общий обработчик
    app.add_exception_handler(Exception, general_exception_handler)
    
    return app

