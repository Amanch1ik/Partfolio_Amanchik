"""API v1 routes"""

from fastapi import APIRouter
import logging
from .endpoints import health


logger = logging.getLogger(__name__)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])


# Включение роутов (с обработкой ошибок, если модули недоступны)
try:
    from .endpoints import users
    api_router.include_router(users.router, prefix="/users", tags=["users"])
except ImportError:
    logger.warning("users router not available")

try:
    from .endpoints import payments
    api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
except ImportError:
    logger.warning("payments router not available")

try:
    from .endpoints import notifications
    api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
except ImportError:
    logger.warning("notifications router not available")

try:
    from .endpoints import achievements
    api_router.include_router(achievements.router, prefix="/achievements", tags=["achievements"])
except ImportError:
    logger.warning("achievements router not available")

try:
    from .endpoints import reviews
    api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
except ImportError:
    logger.warning("reviews router not available")

try:
    from .endpoints import promotions
    api_router.include_router(promotions.router, prefix="/promotions", tags=["promotions"])
except ImportError:
    logger.warning("promotions router not available")

try:
    from .endpoints import analytics
    api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
except ImportError:
    logger.warning("analytics router not available")