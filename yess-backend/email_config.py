from pydantic import BaseSettings

class EmailSettings(BaseSettings):
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "noreply@yess-loyalty.com"
    SMTP_PASSWORD: str = ""  # Будет заполнен из env
    
    # Настройки писем
    DEFAULT_FROM_EMAIL: str = "noreply@yess-loyalty.com"
    SUPPORT_EMAIL: str = "support@yess-loyalty.com"
    
    # Шаблоны писем
    EMAIL_TEMPLATES: dict = {
        "welcome": "emails/welcome.html",
        "password_reset": "emails/password_reset.html",
        "transaction": "emails/transaction.html"
    }
    
    # Политика отправки
    MAX_EMAILS_PER_DAY: int = 1000
    EMAIL_RETRY_LIMIT: int = 3

email_settings = EmailSettings()
