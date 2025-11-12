import os
from functools import lru_cache
from typing import Optional, Dict, Any, List
try:
    from pydantic_settings import BaseSettings
    from pydantic import ConfigDict
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import BaseSettings
    PYDANTIC_V2 = False


class Settings(BaseSettings):
    PROJECT_NAME: str = "Yess Loyalty"

    # Application
    DEBUG: bool = False
    DEVELOPMENT_MODE: bool = os.getenv("DEVELOPMENT_MODE", "true").lower() == "true"  # Режим разработки (без проверки пароля)
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Database
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")  # По умолчанию localhost для разработки
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "yess_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "yess_db")
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    DATABASE_URL: Optional[str] = None  # Alternative database URL

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Автоматически собираем SQLALCHEMY_DATABASE_URI если не задан
        if not self.SQLALCHEMY_DATABASE_URI and not self.DATABASE_URL:
            # Если DATABASE_URL задан в env, используем его
            if os.getenv("DATABASE_URL"):
                self.DATABASE_URL = os.getenv("DATABASE_URL")
                self.SQLALCHEMY_DATABASE_URI = self.DATABASE_URL
            else:
                self.SQLALCHEMY_DATABASE_URI = (
                    f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                    f"@{self.POSTGRES_HOST}/{self.POSTGRES_DB}"
                )

    # Auth & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_ME")
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days in minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Payment Webhook
    PAYMENT_WEBHOOK_SECRET: str = os.getenv("PAYMENT_WEBHOOK_SECRET", "default_webhook_secret_change_me")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",  # Admin panel
        "http://localhost:3002",  # Partner panel
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",  # Admin panel
        "http://127.0.0.1:3002",  # Partner panel
        "http://127.0.0.1:8000",
    ]

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000

    # Middleware & Monitoring
    ENABLE_PERFORMANCE_MONITORING: bool = False
    LOG_LEVEL: str = "INFO"  # Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL

    # File Uploads & Storage
    UPLOAD_DIRECTORY: str = "/app/uploads"
    UPLOAD_DIR: str = "/app/uploads"  # Alternative name used in storage.py
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # Alternative name
    ALLOWED_FILE_TYPES: List[str] = ["jpg", "jpeg", "png", "gif", "pdf"]
    ALLOWED_IMAGE_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "gif"]
    STATIC_URL: str = "/static"

    # AWS S3 Configuration
    USE_S3: bool = False
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = ""

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_CACHE_TTL: int = 3600  # Default cache TTL in seconds

    # SMS Notifications (Twilio)
    SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")  # Alternative name

    # Push Notifications (Firebase)
    PUSH_ENABLED: bool = False
    FCM_SERVER_KEY: str = os.getenv("FCM_SERVER_KEY", "")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

    # Email Notifications (SendGrid)
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL: str = "noreply@yess-loyalty.com"

    # Map Services
    GOOGLE_MAPS_API_KEY: str = ""
    MAPBOX_API_KEY: str = ""

    # Business Rules
    TOPUP_MULTIPLIER: float = 1.0  # Bonus multiplier for top-ups

    # Bank Integrations - Optimal Bank
    OPTIMAL_BANK_API_URL: str = ""
    OPTIMAL_BANK_MERCHANT_ID: str = ""
    OPTIMAL_BANK_SECRET_KEY: str = ""

    # Bank Integrations - Demir Bank
    DEMIR_BANK_API_URL: str = ""
    DEMIR_BANK_MERCHANT_ID: str = ""
    DEMIR_BANK_SECRET_KEY: str = ""

    # Bank Integrations - RSK Bank
    RSK_BANK_API_URL: str = ""
    RSK_BANK_MERCHANT_ID: str = ""
    RSK_BANK_SECRET_KEY: str = ""

    # Bank Integrations - Bakai Bank
    BAKAI_BANK_API_URL: str = ""
    BAKAI_BANK_MERCHANT_ID: str = ""
    BAKAI_BANK_SECRET_KEY: str = ""

    # Payment System - Elcart
    ELCART_API_URL: str = ""
    ELCART_MERCHANT_ID: str = ""
    ELCART_SECRET_KEY: str = ""


# Настройка конфигурации в зависимости от версии pydantic
if PYDANTIC_V2:
    Settings.model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Игнорировать дополнительные поля из .env
    )
else:
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Игнорировать дополнительные поля из .env
    
    Settings.Config = Config


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
