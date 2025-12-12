from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import re

class SecurityManager:
    """Комплексный менеджер безопасности"""
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    SECRET_KEY = secrets.token_hex(32)  # Криптографически безопасный ключ
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    @classmethod
    def verify_password(cls, plain_password: str, hashed_password: str) -> bool:
        """
        Проверка пароля с расширенной валидацией
        
        Args:
            plain_password (str): Пароль в открытом виде
            hashed_password (str): Хэшированный пароль
        
        Returns:
            bool: Результат проверки пароля
        """
        if not cls._validate_password_strength(plain_password):
            return False
        return cls.pwd_context.verify(plain_password, hashed_password)

    @classmethod
    def get_password_hash(cls, password: str) -> str:
        """
        Хэширование пароля с проверкой сложности
        
        Args:
            password (str): Пароль для хэширования
        
        Returns:
            str: Хэшированный пароль
        """
        if not cls._validate_password_strength(password):
            raise ValueError("Пароль не соответствует требованиям безопасности")
        return cls.pwd_context.hash(password)

    @classmethod
    def _validate_password_strength(cls, password: str) -> bool:
        """
        Проверка сложности пароля
        
        Требования:
        - Минимум 12 символов
        - Содержит заглавные и строчные буквы
        - Содержит цифры
        - Содержит специальные символы
        
        Args:
            password (str): Проверяемый пароль
        
        Returns:
            bool: Соответствие требованиям
        """
        if len(password) < 12:
            return False
        
        if not re.search(r'[A-Z]', password):
            return False
        
        if not re.search(r'[a-z]', password):
            return False
        
        if not re.search(r'\d', password):
            return False
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False
        
        return True

    @classmethod
    def create_access_token(cls, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Создание JWT токена с расширенной защитой
        
        Args:
            data (Dict[str, Any]): Данные для кодирования
            expires_delta (Optional[timedelta]): Время жизни токена
        
        Returns:
            str: JWT токен
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),  # Время создания токена
            "jti": secrets.token_hex(16)  # Уникальный идентификатор токена
        })
        
        encoded_jwt = jwt.encode(to_encode, cls.SECRET_KEY, algorithm=cls.ALGORITHM)
        return encoded_jwt

    @classmethod
    def validate_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """
        Валидация токена с расширенной проверкой
        
        Args:
            token (str): JWT токен
        
        Returns:
            Optional[Dict[str, Any]]: Декодированный payload или None
        """
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            # Токен просрочен
            return None
        except jwt.JWTError:
            # Ошибка декодирования токена
            return None

    @classmethod
    def generate_reset_token(cls, user_id: str, expires_delta: timedelta = timedelta(hours=1)) -> str:
        """
        Генерация токена сброса пароля
        
        Args:
            user_id (str): Идентификатор пользователя
            expires_delta (timedelta): Время жизни токена
        
        Returns:
            str: Токен сброса пароля
        """
        return cls.create_access_token(
            {"sub": user_id, "type": "password_reset"}, 
            expires_delta
        )
