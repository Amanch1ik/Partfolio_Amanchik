from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.models.user import User
from app.core.exceptions import AuthenticationException
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against its hash
        """
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """
        Hash a password for storing
        """
        return pwd_context.hash(password)

    @classmethod
    def create_access_token(
            cls,
            data: Dict[str, Any],
            expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token
        """
        to_encode = data.copy()

        expire = datetime.utcnow() + (
            expires_delta if expires_delta else timedelta(minutes=15)
        )
        to_encode.update({"exp": expire})

        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    @classmethod
    def authenticate_user(
            cls,
            db: Session,
            phone_number: str,
            password: str
    ) -> Optional[User]:
        """
        Authenticate a user by phone number + password
        """
        user = db.query(User).filter(User.phone == phone_number).first()

        if not user:
            raise AuthenticationException("Пользователь не найден")

        if not cls.verify_password(password, user.password_hash):
            raise AuthenticationException("Неверный пароль")

        return user

    @classmethod
    def register_user(
            cls,
            db: Session,
            phone_number: str,
            password: str,
            first_name: str,
            last_name: str,
            **kwargs
    ) -> User:
        """
        Register a new user
        """
        existing_user = db.query(User).filter(User.phone == phone_number).first()
        if existing_user:
            raise AuthenticationException("Пользователь с таким номером телефона уже существует")

        hashed_password = cls.get_password_hash(password)

        new_user = User(
            phone=phone_number,
            password_hash=hashed_password,
            first_name=first_name,
            last_name=last_name,
            name=f"{first_name} {last_name}",
            **kwargs
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and return the current authenticated user from JWT
    Использует dependency injection для сессии БД вместо создания новой
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истек",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
        )

    # Используем переданную сессию вместо создания новой
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    return user
