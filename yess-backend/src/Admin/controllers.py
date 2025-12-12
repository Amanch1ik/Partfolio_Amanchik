from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from src.core.database import get_db
from src.Admin.services import (
    AdminAuthService, 
    AdminDashboardService, 
    AdminUserManagementService
)
from src.Admin.models import AdminUser

admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.post("/login")
def admin_login(
    username: str, 
    password: str, 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Аутентификация администратора"""
    admin_user = AdminAuthService.authenticate_admin(db, username, password)
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные"
        )
    
    access_token = AdminAuthService.create_access_token({
        "sub": admin_user.username,
        "is_superadmin": admin_user.is_superadmin,
        "is_partner_admin": admin_user.is_partner_admin
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin_user.id,
            "username": admin_user.username,
            "is_superadmin": admin_user.is_superadmin
        }
    }

@admin_router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Получение глобальной статистики"""
    return AdminDashboardService.get_global_dashboard(db)

@admin_router.get("/users")
def list_users(
    page: int = 1, 
    page_size: int = 50,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Список пользователей с пагинацией"""
    return AdminUserManagementService.list_users(db, page, page_size)

@admin_router.post("/users/{user_id}/block")
def block_user(
    user_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Блокировка пользователя"""
    result = AdminUserManagementService.block_user(
        db, 
        user_id, 
        current_admin.id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return {"status": "success", "message": "Пользователь заблокирован"}

@admin_router.get("/system-config")
def get_system_config(
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Получение системных настроек"""
    return AdminDashboardService.get_system_config(db)

@admin_router.post("/system-config")
def update_system_config(
    key: str,
    value: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Обновление системной настройки"""
    result = AdminDashboardService.update_system_config(
        db, 
        key, 
        value, 
        current_admin.id
    )
    
    return {"status": "success", "message": "Настройка обновлена"}

def get_current_admin(
    db: Session = Depends(get_db)
) -> AdminUser:
    """Получение текущего администратора из токена"""
    # Здесь будет реализована логика извлечения администратора из токена
    # В реальном проекте это будет более сложная проверка
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Требуется аутентификация администратора"
    )
