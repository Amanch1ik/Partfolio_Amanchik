"""
Authentication dependencies
"""
from typing import Optional
import jwt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from types import SimpleNamespace

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# OAuth2 scheme для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Получить текущего пользователя из JWT токена
    
    Args:
        token (str): JWT токен из Authorization header
        db (Session): Сессия базы данных
    
    Returns:
        User: Текущий пользователь
    
    Raises:
        HTTPException: Если токен невалидный или пользователь не найден
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Декодируем JWT токен
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Извлекаем user_id из payload
        user_id: Optional[str] = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истёк",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if user is None:
            # В режиме разработки создаем мокового пользователя
            if settings.DEVELOPMENT_MODE:
                logger.warning(f"User {user_id} not found in DB, creating mock user for development")
                user = SimpleNamespace(
                    id=int(user_id),
                    email=f"user{user_id}@dev.local",
                    phone=f"+996555{abs(hash(str(user_id))) % 1000000:06d}",
                    first_name="Dev",
                    last_name="User",
                    password_hash="dev_mode_no_check",
                    is_active=True,
                    referral_code=f"DEV{abs(hash(str(user_id))) % 10000:04d}",
                    city_id=None,
                    avatar_url=None
                )
            else:
                raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь неактивен"
            )
        
        return user
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_current_user: {str(e)}")
        # В режиме разработки создаем мокового пользователя при ошибке БД
        if settings.DEVELOPMENT_MODE:
            logger.warning(f"Database unavailable, creating mock user for development (user_id: {user_id})")
            user = SimpleNamespace(
                id=int(user_id),
                email=f"user{user_id}@dev.local",
                phone=f"+996555{abs(hash(str(user_id))) % 1000000:06d}",
                first_name="Dev",
                last_name="User",
                password_hash="dev_mode_no_check",
                is_active=True,
                referral_code=f"DEV{abs(hash(str(user_id))) % 10000:04d}",
                city_id=None,
                avatar_url=None
            )
            return user
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ошибка подключения к базе данных"
        )

