import os
import pyotp
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.Admin.models import AdminUser, AuditLog

class AdminSecurityManager:
    """Расширенный менеджер безопасности администраторов"""
    
    # Используем переменные окружения вместо хардкода
    SECRET_KEY = os.getenv("ADMIN_SECRET_KEY") or os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
    ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ADMIN_TOKEN_EXPIRE_MINUTES", "30"))
    
    @classmethod
    def _validate_secret_key(cls):
        """Проверка наличия секретного ключа"""
        if not cls.SECRET_KEY or cls.SECRET_KEY in ["super_secret_admin_security_key_2023!", "CHANGE_ME", ""]:
            raise ValueError(
                "ADMIN_SECRET_KEY или SECRET_KEY не установлен в переменных окружения. "
                "Установите безопасный секретный ключ в .env файле."
            )
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="admin/login")

    @classmethod
    def generate_totp_secret(cls) -> str:
        """Генерация секрета для двухфакторной аутентификации"""
        return pyotp.random_base32()

    @classmethod
    def verify_totp(cls, secret: str, token: str) -> bool:
        """Проверка токена двухфакторной аутентификации"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token)

    @classmethod
    def create_access_token(
        cls, 
        data: Dict[str, Any], 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Создание JWT токена с расширенной защитой"""
        cls._validate_secret_key()
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": pyotp.random_base32()  # Уникальный идентификатор токена
        })
        
        return jwt.encode(to_encode, cls.SECRET_KEY, algorithm=cls.ALGORITHM)

    @classmethod
    def validate_token(cls, token: str) -> Dict[str, Any]:
        """Валидация токена с расширенной проверкой"""
        cls._validate_secret_key()
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Токен истек")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Неверный токен")

    @classmethod
    def log_security_event(
        cls, 
        db: Session, 
        admin_id: int, 
        event_type: str, 
        details: str = None
    ):
        """Логирование событий безопасности"""
        audit_log = AuditLog(
            admin_id=admin_id,
            action=event_type,
            details=details or event_type
        )
        db.add(audit_log)
        db.commit()

    @classmethod
    def check_password_complexity(cls, password: str) -> bool:
        """Проверка сложности пароля"""
        if len(password) < 12:
            return False
        
        has_uppercase = any(c.isupper() for c in password)
        has_lowercase = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        return has_uppercase and has_lowercase and has_digit and has_special

    @classmethod
    def get_current_admin(
        cls, 
        token: str = Security(oauth2_scheme), 
        db: Session = None
    ) -> AdminUser:
        """Получение текущего администратора из токена"""
        try:
            payload = cls.validate_token(token)
            username = payload.get("sub")
            
            if not username:
                raise HTTPException(status_code=401, detail="Неверный токен")
            
            admin = db.query(AdminUser).filter(AdminUser.username == username).first()
            
            if not admin:
                raise HTTPException(status_code=401, detail="Администратор не найден")
            
            return admin
        
        except JWTError:
            raise HTTPException(status_code=401, detail="Ошибка аутентификации")

    @classmethod
    def attempt_login(
        cls, 
        db: Session, 
        username: str, 
        password: str, 
        totp_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Попытка входа с двухфакторной аутентификацией"""
        admin = db.query(AdminUser).filter(AdminUser.username == username).first()
        
        if not admin or not cls.pwd_context.verify(password, admin.password_hash):
            cls.log_security_event(db, admin.id if admin else None, "login_failed")
            raise HTTPException(status_code=401, detail="Неверные учетные данные")
        
        # Проверка двухфакторной аутентификации, если включена
        if admin.totp_secret:
            if not totp_token or not cls.verify_totp(admin.totp_secret, totp_token):
                cls.log_security_event(db, admin.id, "2fa_failed")
                raise HTTPException(status_code=401, detail="Неверный код двухфакторной аутентификации")
        
        # Создание токена
        access_token = cls.create_access_token({"sub": admin.username})
        
        # Логирование успешного входа
        cls.log_security_event(db, admin.id, "login_success")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "admin_id": admin.id
        }
