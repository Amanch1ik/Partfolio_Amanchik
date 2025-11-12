"""
Authentication endpoints
"""
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.services.dependencies import get_current_user
from app.schemas.user import UserCreate, UserResponse, TokenResponse
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    phone: str
    password: str


@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Регистрация нового пользователя
    
    Принимает JSON:
    {
      "phone_number": "...",
      "password": "...",
      "first_name": "...",
      "last_name": "..."
    }
    """
    try:
        new_user = AuthService.register_user(
            db=db,
            phone_number=user_data.phone_number,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            city_id=user_data.city_id,
            referral_code=user_data.referral_code
        )

        return UserResponse(
            id=new_user.id,
            phone_number=new_user.phone,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            email=new_user.email,
            city_id=new_user.city_id,
            referral_code=new_user.referral_code,
            created_at=new_user.created_at
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    Аутентификация пользователя (OAuth2 form-data)
    
    Использует OAuth2PasswordRequestForm (username = phone_number)
    Возвращает:
    {
      "access_token": "...",
      "token_type": "bearer",
      "user_id": 1,
      "user": {...}
    }
    """
    try:
        # form_data.username содержит phone_number
        user = AuthService.authenticate_user(
            db=db,
            phone_number=form_data.username,
            password=form_data.password
        )

        # Создаем access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthService.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            user=UserResponse(
                id=user.id,
                phone_number=user.phone,
                first_name=user.first_name or "",
                last_name=user.last_name or "",
                email=user.email,
                city_id=user.city_id,
                referral_code=user.referral_code,
                created_at=user.created_at
            )
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/login/json", response_model=TokenResponse)
def login_user_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Аутентификация пользователя (JSON)
    
    Принимает JSON:
    {
      "phone": "+996555123456",
      "password": "password123"
    }
    
    Возвращает:
    {
      "access_token": "...",
      "token_type": "bearer",
      "user_id": 1,
      "user": {...}
    }
    """
    try:
        user = AuthService.authenticate_user(
            db=db,
            phone_number=login_data.phone,
            password=login_data.password
        )

        # Создаем access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthService.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            user=UserResponse(
                id=user.id,
                phone_number=user.phone,
                first_name=user.first_name or "",
                last_name=user.last_name or "",
                email=user.email,
                city_id=user.city_id,
                referral_code=user.referral_code,
                created_at=user.created_at
            )
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Получение данных текущего пользователя по токену
    
    Требует Authorization: Bearer <token>
    """
    return UserResponse(
        id=current_user.id,
        phone_number=current_user.phone,
        first_name=current_user.first_name or "",
        last_name=current_user.last_name or "",
        email=current_user.email,
        city_id=current_user.city_id,
        referral_code=current_user.referral_code,
        created_at=current_user.created_at
    )
