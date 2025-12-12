from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class AdminUser(Base):
    """Модель администратора системы"""
    __tablename__ = 'admin_users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_superadmin = Column(Boolean, default=False)
    is_partner_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AdminUser {self.username}>"

class SystemConfig(Base):
    """Системные настройки"""
    __tablename__ = 'system_configs'

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    """Журнал аудита действий администраторов"""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey('admin_users.id'), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(String(255))
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("AdminUser")

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.admin_id}>"
