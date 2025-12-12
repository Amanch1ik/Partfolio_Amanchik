from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, Any, List

from src.models.user import User
from src.models.transaction import Transaction
from src.models.partner import Partner

class AdminAnalyticsService:
    """Сервис аналитики для администраторов"""

    @staticmethod
    def get_revenue_dynamics(
        db: Session, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Динамика выручки за указанный период"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        revenue_by_day = (
            db.query(
                func.date_trunc('day', Transaction.created_at).label('day'),
                func.sum(Transaction.amount).label('total_revenue')
            )
            .filter(Transaction.created_at >= start_date)
            .group_by(func.date_trunc('day', Transaction.created_at))
            .order_by('day')
            .all()
        )
        
        return [
            {
                "date": day.strftime('%Y-%m-%d'),
                "revenue": float(revenue)
            } for day, revenue in revenue_by_day
        ]

    @staticmethod
    def get_user_growth(
        db: Session, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Динамика роста пользователей"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        user_growth = (
            db.query(
                func.date_trunc('day', User.registration_date).label('day'),
                func.count(User.id).label('new_users')
            )
            .filter(User.registration_date >= start_date)
            .group_by(func.date_trunc('day', User.registration_date))
            .order_by('day')
            .all()
        )
        
        return [
            {
                "date": day.strftime('%Y-%m-%d'),
                "new_users": int(users)
            } for day, users in user_growth
        ]

class AdminReportService:
    """Сервис генерации отчетов"""

    @staticmethod
    def generate_partner_performance_report(
        db: Session, 
        start_date: datetime = None, 
        end_date: datetime = None
    ) -> List[Dict[str, Any]]:
        """Отчет о производительности партнеров"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        partner_performance = (
            db.query(
                Partner.id,
                Partner.name,
                func.count(Transaction.id).label('total_transactions'),
                func.sum(Transaction.amount).label('total_revenue'),
                func.avg(Transaction.amount).label('avg_transaction')
            )
            .join(Transaction, Partner.id == Transaction.partner_id)
            .filter(Transaction.created_at.between(start_date, end_date))
            .group_by(Partner.id, Partner.name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
        
        return [
            {
                "partner_id": partner_id,
                "partner_name": name,
                "total_transactions": int(transactions),
                "total_revenue": float(revenue),
                "avg_transaction": float(avg_transaction)
            } for partner_id, name, transactions, revenue, avg_transaction in partner_performance
        ]

class AdminNotificationService:
    """Сервис управления уведомлениями"""

    @staticmethod
    def create_system_notification(
        db: Session, 
        title: str, 
        message: str, 
        admin_id: int,
        target_users: List[int] = None
    ) -> bool:
        """Создание системного уведомления"""
        try:
            # Логика создания уведомлений для пользователей
            # В реальном проекте будет более сложная реализация
            
            # Логирование действия
            audit_log = AuditLog(
                admin_id=admin_id,
                action="Create system notification",
                details=f"Title: {title}"
            )
            db.add(audit_log)
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            return False
