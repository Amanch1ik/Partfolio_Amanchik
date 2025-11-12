import json
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.error_handler import setup_error_handlers
from app.core.performance_middleware import PerformanceMonitoringMiddleware
from app.core.security_middleware import SecurityMiddleware
from app.core.rate_limit import RateLimitMiddleware

# ✅ Единый роутер API v1
from app.api.v1.api_router import api_router


# Создание FastAPI приложения
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="YESS API Backend",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ---- CORS (должен быть ПЕРВЫМ) ----
# Убеждаемся, что CORS_ORIGINS содержит нужные origins
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

# Добавляем CORS middleware ПЕРВЫМ, чтобы он обрабатывал все запросы
# В режиме разработки используем allow_origin_regex для гибкости
import re
# Расширяем список origins для включения всех localhost портов
extended_origins = cors_origins.copy()
# Добавляем дополнительные порты если нужно
for port in [3000, 3001, 3002, 3003, 3004, 3005]:
    extended_origins.extend([
        f"http://localhost:{port}",
        f"http://127.0.0.1:{port}"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=extended_origins,  # Список разрешенных origins
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+",  # Разрешаем любой localhost порт
    allow_credentials=True,  # Включаем credentials для работы с токенами
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
    expose_headers=["*"],
    max_age=86400,  # 24 hours
)

# ---- Middleware ----
if settings.ENABLE_PERFORMANCE_MONITORING:
    app.add_middleware(PerformanceMonitoringMiddleware)

app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)

setup_error_handlers(app)


# ✅ Подключаем все API-роуты одним include
app.include_router(api_router, prefix="/api/v1")

# Явная обработка OPTIONS запросов для всех путей (после роутеров, но до других обработчиков)
# Это резервный обработчик на случай, если CORSMiddleware не сработает
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    """Обработчик OPTIONS запросов для CORS preflight"""
    from fastapi import Response
    origin = request.headers.get("Origin", "")
    
    # Проверяем, разрешен ли origin
    allowed_origin = origin if origin else "*"
    if origin and (origin in cors_origins or any(orig in origin for orig in ["localhost", "127.0.0.1"])):
        allowed_origin = origin
    elif not origin:
        allowed_origin = "*"
    
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        }
    )


# ---- Root endpoint ----
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "yess-backend",
        "api": "/api/v1",
        "docs": "/docs"
    }


# ---- Health Check Endpoints ----
@app.get("/health")
async def health_check():
    """Общая проверка здоровья системы"""
    from sqlalchemy import text
    from app.core.database import SessionLocal, get_engine_stats
    from app.core.config import settings
    import logging
    
    logger = logging.getLogger(__name__)
    
    db_status = "connected"
    db_error = None
    db_details = {}
    
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1 as test, version() as pg_version"))
        row = result.fetchone()
        db_details = {
            "test": "ok",
            "postgres_version": row[1] if row else "unknown"
        }
        
        # Получаем статистику пула соединений
        try:
            pool_stats = get_engine_stats()
            db_details["pool"] = pool_stats
        except:
            pass
            
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)
        logger.error(f"Database health check failed: {str(e)}")
    finally:
        try:
            db.close()
        except:
            pass
    
    cache_status = "connected"
    cache_error = None
    try:
        import redis
        r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
    except Exception as e:
        cache_status = "disconnected"
        cache_error = str(e)
        logger.warning(f"Redis health check failed: {str(e)}")
    
    overall_status = "healthy" if db_status == "connected" else "unhealthy"
    
    response = {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "database": {
            "status": db_status,
            "error": db_error,
            "details": db_details
        },
        "cache": {
            "status": cache_status,
            "error": cache_error
        },
        "development_mode": settings.DEVELOPMENT_MODE
    }
    
    # Return response with appropriate status code
    from fastapi import Response
    status_code = 200 if overall_status == "healthy" else 503
    return Response(
        content=json.dumps(response, ensure_ascii=False, default=str),
        media_type="application/json",
        status_code=status_code
    )


@app.get("/health/db")
async def health_check_db():
    """Детальная проверка базы данных"""
    from sqlalchemy import text
    from app.core.database import SessionLocal, get_engine_stats
    from app.core.config import settings
    import logging
    import json
    
    logger = logging.getLogger(__name__)
    
    try:
        db = SessionLocal()
        
        # Проверка подключения
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        
        # Получение версии PostgreSQL
        version_result = db.execute(text("SELECT version()"))
        pg_version = version_result.fetchone()[0]
        
        # Получение информации о базе данных
        db_info_result = db.execute(text("""
            SELECT 
                current_database() as db_name,
                current_user as db_user,
                inet_server_addr() as server_address,
                inet_server_port() as server_port
        """))
        db_info = db_info_result.fetchone()
        
        # Статистика пула соединений
        pool_stats = get_engine_stats()
        
        # Проверка таблиц
        tables_result = db.execute(text("""
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        table_count = tables_result.fetchone()[0]
        
        db.close()
        
        return {
            "status": "connected",
            "postgres_version": pg_version,
            "database_name": db_info[0] if db_info else "unknown",
            "database_user": db_info[1] if db_info else "unknown",
            "server_address": str(db_info[2]) if db_info and db_info[2] else "unknown",
            "server_port": db_info[3] if db_info and db_info[3] else "unknown",
            "table_count": table_count,
            "connection_pool": pool_stats,
            "database_url": settings.SQLALCHEMY_DATABASE_URI or settings.DATABASE_URL or "not configured"
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail={
                "status": "disconnected",
                "error": str(e),
                "database_url": settings.SQLALCHEMY_DATABASE_URI or settings.DATABASE_URL or "not configured"
            }
        )


# ---- Local Run ----
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
