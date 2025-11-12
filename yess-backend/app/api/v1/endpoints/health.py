# app/api/v1/endpoints/health.py
from fastapi import APIRouter
from sqlalchemy import text
from app.core.database import SessionLocal
import redis
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    db_status = "connected"
    cache_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
    finally:
        db.close()

    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.ping()
    except Exception:
        cache_status = "disconnected"

    status = "healthy" if db_status == "connected" and cache_status == "connected" else "degraded"

    return {
        "status": status,
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "database": db_status,
        "cache": cache_status
    }
