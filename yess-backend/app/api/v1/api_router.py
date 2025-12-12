from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Импортируем роутеры
from app.api.v1 import auth
from app.api.v1 import routes
from app.api.v1 import location
from app.api.v1 import partner
from app.api.v1 import wallet
from app.api.v1 import order
from app.api.v1 import upload
from app.api.v1 import qr

api_router = APIRouter()

# Основные маршруты
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(routes.router, prefix="/routes", tags=["Routes"])
api_router.include_router(location.router, prefix="/locations", tags=["Locations"])
api_router.include_router(partner.router, prefix="/partners", tags=["Partners"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
# Order routers
try:
    from app.api.v1 import orders
    api_router.include_router(orders.router, tags=["Orders"])
    logger.info("✅ Orders router loaded")
except ImportError as e:
    logger.warning(f"orders router not available: {e}")

try:
    from app.api.v1 import order_payments
    api_router.include_router(order_payments.router, tags=["Order Payments"])
    logger.info("✅ Order payments router loaded")
except ImportError as e:
    logger.warning(f"order_payments router not available: {e}")

# Partner products router
try:
    from app.api.v1 import partner_products
    api_router.include_router(partner_products.router, tags=["Partner Products"])
    logger.info("✅ Partner products router loaded")
except ImportError as e:
    logger.warning(f"partner_products router not available: {e}")

# Webhooks router
try:
    from app.api.v1 import webhooks
    api_router.include_router(webhooks.router, tags=["Webhooks"])
    logger.info("✅ Webhooks router loaded")
except ImportError as e:
    logger.warning(f"webhooks router not available: {e}")
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(qr.router, prefix="/qr", tags=["QR"])

# Stories router (public)
try:
    from app.api.v1 import stories
    api_router.include_router(stories.router, tags=["Stories"])
    logger.info("✅ Stories router loaded")
except ImportError as e:
    logger.warning(f"stories router not available: {e}")

# Admin router
try:
    from app.api.v1 import admin
    api_router.include_router(admin.router, tags=["Admin"])
    logger.info("✅ Admin router loaded")
except ImportError as e:
    logger.warning(f"admin router not available: {e}")

# Admin Stories router
try:
    from app.api.v1.admin import stories as admin_stories
    api_router.include_router(admin_stories.router, tags=["Admin Stories"])
    logger.info("✅ Admin Stories router loaded")
except ImportError as e:
    logger.warning(f"admin stories router not available: {e}")

# Optional routers - try to import if available
try:
    from app.api.v1 import unified
    api_router.include_router(unified.router, prefix="/unified", tags=["Unified"])
except ImportError as e:
    logger.warning(f"unified router not available: {e}")

# Partner Panel routers
try:
    from app.api.v1 import partner_dashboard
    api_router.include_router(partner_dashboard.router, tags=["Partner Dashboard"])
    logger.info("✅ Partner dashboard router loaded")
except ImportError as e:
    logger.warning(f"partner_dashboard router not available: {e}")

try:
    from app.api.v1 import partner_auth
    api_router.include_router(partner_auth.router, tags=["Partner Auth"])
    logger.info("✅ Partner auth router loaded")
except ImportError as e:
    logger.warning(f"partner_auth router not available: {e}")

try:
    from app.api.v1 import partner_locations
    api_router.include_router(partner_locations.router, tags=["Partner Locations"])
    logger.info("✅ Partner locations router loaded")
except ImportError as e:
    logger.warning(f"partner_locations router not available: {e}")
