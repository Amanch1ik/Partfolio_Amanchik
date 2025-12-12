from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.Admin.models import AdminUser, SystemConfig, AuditLog
from src.models.user import User
from src.models.partner import Partner
from src.models.transaction import Transaction

class AdminAuthService:
    """Сервис аутентификации и управления администраторами"""
    
    # Используем переменные окружения вместо хардкода
    SECRET_KEY = os.getenv("ADMIN_SECRET_KEY") or os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
    ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ADMIN_TOKEN_EXPIRE_MINUTES", "60"))
    
    @classmethod
    def _validate_secret_key(cls):
        """Проверка наличия секретного ключа"""
        if not cls.SECRET_KEY or cls.SECRET_KEY in ["super_secret_admin_key_2023!", "CHANGE_ME", ""]:
            raise ValueError(
                "ADMIN_SECRET_KEY или SECRET_KEY не установлен в переменных окружения. "
                "Установите безопасный секретный ключ в .env файле."
            )

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    @classmethod
    def verify_password(cls, plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return cls.pwd_context.verify(plain_password, hashed_password)

    @classmethod
    def get_password_hash(cls, password: str) -> str:
        """Хэширование пароля"""
        return cls.pwd_context.hash(password)

    @classmethod
    def create_access_token(cls, data: Dict[str, Any]) -> str:
        """Создание JWT токена"""
        cls._validate_secret_key()
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, cls.SECRET_KEY, algorithm=cls.ALGORITHM)

    @classmethod
    def authenticate_admin(cls, db: Session, username: str, password: str) -> Optional[AdminUser]:
        """Аутентификация администратора"""
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if not user or not cls.verify_password(password, user.password_hash):
            return None
        
        user.last_login = datetime.utcnow()
        db.commit()
        return user

class AdminDashboardService:
    """Сервис для получения статистики и управления системой"""

    @staticmethod
    def get_global_dashboard(db: Session) -> Dict[str, Any]:
        """Глобальная статистика системы"""
        return {
            "total_users": db.query(User).count(),
            "total_partners": db.query(Partner).count(),
            "total_transactions": db.query(Transaction).count(),
            "total_revenue": db.query(func.sum(Transaction.amount)).scalar() or 0,
            "active_users": db.query(User).filter(User.is_active == True).count(),
            "verified_partners": db.query(Partner).filter(Partner.is_verified == True).count()
        }

    @staticmethod
    def get_system_config(db: Session) -> Dict[str, str]:
        """Получение системных настроек"""
        configs = db.query(SystemConfig).all()
        return {config.key: config.value for config in configs}

    @staticmethod
    def update_system_config(db: Session, key: str, value: str, admin_id: int) -> bool:
        """Обновление системной настройки"""
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        
        if not config:
            config = SystemConfig(key=key, value=value)
            db.add(config)
        else:
            config.value = value
        
        # Логирование изменения
        audit_log = AuditLog(
            admin_id=admin_id,
            action=f"Update system config: {key}",
            details=f"Changed value to: {value}"
        )
        db.add(audit_log)
        
        db.commit()
        return True

class AdminUserManagementService:
    """Сервис управления пользователями для администраторов"""

    @staticmethod
    def list_users(db: Session, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Список пользователей с пагинацией"""
        total_users = db.query(User).count()
        users = (
            db.query(User)
            .order_by(User.registration_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "total": total_users,
            "page": page,
            "page_size": page_size,
            "users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "registration_date": user.registration_date,
                    "is_active": user.is_active,
                    "loyalty_level": user.loyalty_level
                } for user in users
            ]
        }

    @staticmethod
    def block_user(db: Session, user_id: int, admin_id: int) -> bool:
        """Блокировка пользователя"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.is_active = False
        
        # Логирование действия
        audit_log = AuditLog(
            admin_id=admin_id,
            action="Block user",
            details=f"Blocked user ID: {user_id}"
        )
        db.add(audit_log)
        
        db.commit()
        return True

class AdminPartnerService:
    """Сервис управления партнерами для администраторов"""

    @staticmethod
    def list_partners(
        db: Session, 
        page: int = 1, 
        page_size: int = 50, 
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Список партнеров с фильтрацией"""
        query = db.query(Partner)
        
        if status == 'verified':
            query = query.filter(Partner.is_verified == True)
        elif status == 'unverified':
            query = query.filter(Partner.is_verified == False)
        
        total_partners = query.count()
        partners = (
            query.order_by(Partner.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "total": total_partners,
            "page": page,
            "page_size": page_size,
            "partners": [
                {
                    "id": partner.id,
                    "name": partner.name,
                    "category": partner.category,
                    "is_verified": partner.is_verified,
                    "total_transactions": db.query(Transaction)
                        .filter(Transaction.partner_id == partner.id)
                        .count(),
                    "total_revenue": db.query(func.sum(Transaction.amount))
                        .filter(Transaction.partner_id == partner.id)
                        .scalar() or 0
                } for partner in partners
            ]
        }

    @staticmethod
    def verify_partner(
        db: Session, 
        partner_id: int, 
        admin_id: int
    ) -> bool:
        """Верификация партнера"""
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            return False

        partner.is_verified = True
        
        # Логирование действия
        audit_log = AuditLog(
            admin_id=admin_id,
            action="Verify partner",
            details=f"Verified partner ID: {partner_id}"
        )
        db.add(audit_log)
        
        db.commit()
        return True

    @staticmethod
    def create_partner(
        db: Session, 
        admin_id: int, 
        name: str, 
        category: str, 
        description: Optional[str] = None
    ) -> Partner:
        """Создание нового партнера администратором"""
        new_partner = Partner(
            name=name,
            category=category,
            description=description,
            is_verified=False  # По умолчанию не верифицирован
        )
        db.add(new_partner)
        
        # Логирование действия
        audit_log = AuditLog(
            admin_id=admin_id,
            action="Create partner",
            details=f"Created partner: {name}"
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(new_partner)
        return new_partner

    @staticmethod
    def update_partner_cashback_rate(
        db: Session, 
        partner_id: int, 
        admin_id: int, 
        new_rate: float
    ) -> bool:
        """Обновление кэшбэк-ставки для партнера"""
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            return False

        partner.default_cashback_rate = new_rate
        
        # Логирование действия
        audit_log = AuditLog(
            admin_id=admin_id,
            action="Update partner cashback rate",
            details=f"Partner ID: {partner_id}, New rate: {new_rate}"
        )
        db.add(audit_log)
        
        db.commit()
        return True
