import pyotp
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy.orm import Session
from app.models.user import User, TwoFactorToken
from app.core.config import settings
from app.services.email_service import EmailService

class TwoFactorAuthService:
    def __init__(self, db: Session, email_service: EmailService):
        self.db = db
        self.email_service = email_service
    
    def generate_totp_secret(self) -> str:
        """Генерация секретного ключа для TOTP"""
        return pyotp.random_base32()
    
    def generate_backup_codes(self, count: int = 5) -> list:
        """Генерация резервных кодов восстановления"""
        return [str(uuid.uuid4()).replace('-', '')[:8].upper() for _ in range(count)]
    
    def create_two_factor_token(
        self, 
        user_id: int, 
        method: str = 'email'
    ) -> Dict[str, str]:
        """Создание токена для двухфакторной аутентификации"""
        # Удаление старых токенов
        self.db.query(TwoFactorToken).filter(
            TwoFactorToken.user_id == user_id
        ).delete()
        
        # Генерация секретного ключа и кодов
        totp_secret = self.generate_totp_secret()
        backup_codes = self.generate_backup_codes()
        
        # Создание токена
        token = TwoFactorToken(
            user_id=user_id,
            secret=totp_secret,
            backup_codes=backup_codes,
            method=method,
            expires_at=datetime.utcnow() + timedelta(minutes=30)
        )
        
        self.db.add(token)
        self.db.commit()
        
        return {
            'secret': totp_secret,
            'backup_codes': backup_codes
        }
    
    def verify_totp_code(
        self, 
        user_id: int, 
        code: str
    ) -> bool:
        """Проверка TOTP кода"""
        token = self.db.query(TwoFactorToken).filter(
            TwoFactorToken.user_id == user_id,
            TwoFactorToken.expires_at > datetime.utcnow()
        ).first()
        
        if not token:
            return False
        
        totp = pyotp.TOTP(token.secret)
        return totp.verify(code)
    
    def verify_backup_code(
        self, 
        user_id: int, 
        backup_code: str
    ) -> bool:
        """Проверка резервного кода"""
        token = self.db.query(TwoFactorToken).filter(
            TwoFactorToken.user_id == user_id,
            TwoFactorToken.expires_at > datetime.utcnow()
        ).first()
        
        if not token or backup_code not in token.backup_codes:
            return False
        
        # Удаление использованного кода
        token.backup_codes.remove(backup_code)
        self.db.commit()
        
        return True
    
    def send_verification_code(self, user: User) -> str:
        """Отправка кода верификации"""
        totp = pyotp.TOTP(self.generate_totp_secret())
        code = totp.now()
        
        if user.email:
            self.email_service.send_email(
                to_email=user.email,
                subject="Код двухфакторной аутентификации",
                body=f"Ваш код: {code}. Действителен 10 минут."
            )
        
        return code
    
    def disable_two_factor_auth(self, user_id: int):
        """Отключение двухфакторной аутентификации"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if user:
            user.two_factor_enabled = False
            self.db.query(TwoFactorToken).filter(
                TwoFactorToken.user_id == user_id
            ).delete()
            
            self.db.commit()

def get_two_factor_service(db: Session):
    """Фабрика для создания сервиса двухфакторной аутентификации"""
    email_service = EmailService()
    return TwoFactorAuthService(db, email_service)
