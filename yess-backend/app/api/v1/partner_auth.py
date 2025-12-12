"""
Partner authentication endpoints
"""
import logging
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.partner import PartnerEmployee, Partner
from app.schemas.user import UserResponse, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partner/auth", tags=["Partner Authentication"])


class PartnerLoginRequest(BaseModel):
    username: str  # phone or email
    password: str


@router.post("/login", response_model=TokenResponse)
def partner_login(
    login_data: PartnerLoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Аутентификация партнера
    
    Принимает JSON:
    {
      "username": "+996555123456" или "email@example.com",
      "password": "password123"
    }
    
    В режиме разработки (DEVELOPMENT_MODE=true) пароль не проверяется!
    Можно войти с любым username и любым паролем.
    
    Возвращает:
    {
      "access_token": "...",
      "token_type": "bearer",
      "user_id": 1,
      "user": {...}
    }
    """
    try:
        user = None
        
        # РЕЖИМ РАЗРАБОТКИ: пропускаем проверку пароля
        if settings.DEVELOPMENT_MODE:
            logger.info(f"Development mode: Attempting partner login for username: {login_data.username}")
            
            # Пытаемся использовать БД, но если она недоступна - работаем без неё
            user_obj = None
            db_available = False
            
            try:
                # Пробуем найти пользователя в БД
                user_obj = db.query(User).filter(
                    (User.email == login_data.username) | (User.phone == login_data.username)
                ).first()
                db_available = True
                
                if not user_obj:
                    # Если пользователь не найден, создаем временного
                    try:
                        from datetime import datetime
                        username = login_data.username
                        is_email = "@" in username
                        phone_value = username if not is_email else f"+996555{abs(hash(username)) % 1000000:06d}"
                        email_value = username if is_email else f"{username}@dev.local"
                        
                        # Генерируем уникальный referral_code
                        referral_code = f"DEV{abs(hash(username)) % 10000:04d}"
                        # Проверяем уникальность (в dev режиме можно пропустить)
                        
                        user_obj = User(
                            phone=phone_value,  # Обязательное поле
                            email=email_value,
                            first_name=username.split("@")[0] if is_email else username,
                            last_name="",
                            password_hash="dev_mode_no_check",  # Правильное имя поля
                            is_active=True,
                            referral_code=referral_code,
                            created_at=datetime.utcnow()
                        )
                        db.add(user_obj)
                        db.commit()
                        db.refresh(user_obj)
                        logger.info(f"Created new user in development mode: {user_obj.id}")
                    except SQLAlchemyError as e:
                        logger.warning(f"Database error while creating user (falling back to mock): {str(e)}")
                        db.rollback()
                        db_available = False
                        user_obj = None
                        
            except SQLAlchemyError as e:
                logger.warning(f"Database error while querying user (falling back to mock): {str(e)}")
                db.rollback()
                db_available = False
                user_obj = None
            
            # Если БД недоступна, создаем виртуального пользователя
            if not user_obj and not db_available:
                logger.info("Database unavailable, creating mock user for development")
                # Создаем простой объект-заглушку вместо SQLAlchemy модели
                # Это позволяет работать без БД
                from datetime import datetime
                from types import SimpleNamespace
                
                # Определяем phone и email
                username = login_data.username
                is_email = "@" in username
                phone_value = username if not is_email else f"+996555{abs(hash(username)) % 1000000:06d}"
                email_value = username if is_email else f"{username}@dev.local"
                
                # Создаем простой объект с нужными атрибутами
                user_obj = SimpleNamespace(
                    id=1,
                    phone=phone_value,
                    email=email_value,
                    first_name=username.split("@")[0] if is_email else username,
                    last_name="",
                    password_hash="dev_mode_no_check",
                    is_active=True,
                    referral_code=f"DEV{abs(hash(username)) % 10000:04d}",
                    city_id=None,
                    created_at=datetime.utcnow()
                )
            
            user = user_obj
        else:
            # ПРОДАКШН: нормальная проверка пароля
            # Сначала пробуем по телефону
            try:
                user = AuthService.authenticate_user(
                    db=db,
                    phone_number=login_data.username,
                    password=login_data.password
                )
            except:
                # Если не получилось по телефону, пробуем по email
                user_obj = db.query(User).filter(
                    (User.email == login_data.username) | (User.phone == login_data.username)
                ).first()
                
                if user_obj and AuthService.verify_password(login_data.password, user_obj.password_hash):
                    user = user_obj
                else:
                    raise HTTPException(status_code=401, detail="Неверные учетные данные")
        
        # В режиме разработки пропускаем проверку партнера
        if not settings.DEVELOPMENT_MODE:
            try:
                # Проверяем, является ли пользователь партнером
                partner_employee = db.query(PartnerEmployee).filter(
                    PartnerEmployee.user_id == user.id
                ).first()
                
                if not partner_employee:
                    # Если нет записи в PartnerEmployee, проверяем, является ли пользователь владельцем партнера
                    partner = db.query(Partner).filter(Partner.owner_id == user.id).first()
                    if not partner:
                        raise HTTPException(
                            status_code=403, 
                            detail="Доступ запрещен. Пользователь не является партнером."
                        )
            except SQLAlchemyError as e:
                logger.warning(f"Database error while checking partner status: {str(e)}")
                # В режиме разработки пропускаем проверку при ошибке БД
                if settings.DEVELOPMENT_MODE:
                    pass
                else:
                    raise HTTPException(
                        status_code=503,
                        detail="Ошибка подключения к базе данных"
                    )
        
        # Создаем access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthService.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )

        # Подготавливаем данные пользователя для ответа
        user_data = {
            "id": user.id,
            "phone_number": user.phone if hasattr(user, 'phone') else None,
            "first_name": user.first_name if hasattr(user, 'first_name') and user.first_name else "",
            "last_name": user.last_name if hasattr(user, 'last_name') and user.last_name else "",
            "email": user.email if hasattr(user, 'email') else None,
            "city_id": user.city_id if hasattr(user, 'city_id') else None,
            "referral_code": user.referral_code if hasattr(user, 'referral_code') else None,
            "created_at": user.created_at if hasattr(user, 'created_at') and user.created_at else None
        }
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            user=UserResponse(**user_data)
        )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error in partner login: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Ошибка подключения к базе данных. Попробуйте позже."
        )
    except Exception as e:
        logger.error(f"Unexpected error in partner login: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

