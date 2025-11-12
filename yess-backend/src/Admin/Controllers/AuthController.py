from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from src.Admin.Services.AuthService import AdminAuthService
from src.core.database import get_db

router = APIRouter(prefix="/admin/auth", tags=["admin_auth"])

@router.post("/login")
def admin_login(
    username: str, 
    password: str, 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Аутентификация администратора
    
    Args:
        username (str): Имя пользователя
        password (str): Пароль
        db (Session): Сессия базы данных
    
    Returns:
        Dict[str, Any]: Токен доступа и информация о пользователе
    """
    user = AdminAuthService.authenticate_admin(db, username, password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные"
        )
    
    access_token = AdminAuthService.create_access_token({
        "sub": user.username,
        "is_superadmin": user.is_superadmin,
        "is_partner_admin": user.is_partner_admin
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "is_superadmin": user.is_superadmin,
            "is_partner_admin": user.is_partner_admin
        }
    }

@router.post("/create")
def create_admin(
    username: str, 
    email: str, 
    password: str, 
    is_superadmin: bool = False,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Создание нового администратора
    
    Args:
        username (str): Имя пользователя
        email (str): Email
        password (str): Пароль
        is_superadmin (bool, optional): Флаг суперадмина. По умолчанию False.
        db (Session): Сессия базы данных
    
    Returns:
        Dict[str, Any]: Информация о созданном администраторе
    """
    try:
        admin_user = AdminAuthService.create_admin_user(
            db, 
            username, 
            email, 
            password, 
            is_superadmin
        )
        
        return {
            "id": admin_user.id,
            "username": admin_user.username,
            "email": admin_user.email,
            "is_superadmin": admin_user.is_superadmin
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
