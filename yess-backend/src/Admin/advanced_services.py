from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from src.models.user import User
from src.models.transaction import Transaction
from src.models.partner import Partner
from src.Admin.models import AuditLog

class RiskManagementService:
    """Сервис управления рисками и безопасностью"""

    @staticmethod
    def detect_suspicious_activity(
        db: Session, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Обнаружение подозрительной активности"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Пользователи с большим количеством транзакций
        suspicious_users = (
            db.query(
                User.id, 
                User.username, 
                func.count(Transaction.id).label('transaction_count'),
                func.sum(Transaction.amount).label('total_amount')
            )
            .join(Transaction, User.id == Transaction.user_id)
            .filter(Transaction.created_at >= start_date)
            .group_by(User.id, User.username)
            .having(
                and_(
                    func.count(Transaction.id) > 100,
                    func.sum(Transaction.amount) > 100000
                )
            )
            .all()
        )
        
        return [
            {
                "user_id": user_id,
                "username": username,
                "transaction_count": int(transaction_count),
                "total_amount": float(total_amount)
            } for user_id, username, transaction_count, total_amount in suspicious_users
        ]

    @staticmethod
    def block_suspicious_users(
        db: Session, 
        admin_id: int
    ) -> List[int]:
        """Блокировка подозрительных пользователей"""
        suspicious_users = RiskManagementService.detect_suspicious_activity(db)
        blocked_users = []
        
        for user_info in suspicious_users:
            user = db.query(User).get(user_info['user_id'])
            user.is_active = False
            
            # Логирование действия
            audit_log = AuditLog(
                admin_id=admin_id,
                action="Block suspicious user",
                details=f"User {user.username} blocked due to suspicious activity"
            )
            db.add(audit_log)
            
            blocked_users.append(user.id)
        
        db.commit()
        return blocked_users

class AdvancedReportingService:
    """Расширенный сервис генерации отчетов"""

    @staticmethod
    def generate_comprehensive_report(
        db: Session, 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Генерация всестороннего отчета"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Общая статистика
        total_users = db.query(User).filter(
            User.registration_date.between(start_date, end_date)
        ).count()
        
        total_partners = db.query(Partner).filter(
            Partner.created_at.between(start_date, end_date)
        ).count()
        
        total_transactions = db.query(Transaction).filter(
            Transaction.created_at.between(start_date, end_date)
        ).count()
        
        total_revenue = db.query(func.sum(Transaction.amount)).filter(
            Transaction.created_at.between(start_date, end_date)
        ).scalar() or 0
        
        # Распределение транзакций по партнерам
        partner_transactions = (
            db.query(
                Partner.name, 
                func.count(Transaction.id).label('transaction_count'),
                func.sum(Transaction.amount).label('total_revenue')
            )
            .join(Transaction, Partner.id == Transaction.partner_id)
            .filter(Transaction.created_at.between(start_date, end_date))
            .group_by(Partner.name)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(10)
            .all()
        )
        
        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "total_users": total_users,
            "total_partners": total_partners,
            "total_transactions": total_transactions,
            "total_revenue": float(total_revenue),
            "top_partners": [
                {
                    "name": name,
                    "transaction_count": int(transaction_count),
                    "total_revenue": float(total_revenue)
                } for name, transaction_count, total_revenue in partner_transactions
            ]
        }

class SystemHealthService:
    """Сервис мониторинга здоровья системы"""

    @staticmethod
    def check_system_health(db: Session) -> Dict[str, Any]:
        """Проверка общего состояния системы"""
        return {
            "database": {
                "total_users": db.query(User).count(),
                "total_partners": db.query(Partner).count(),
                "total_transactions": db.query(Transaction).count()
            },
            "recent_activity": {
                "users_last_24h": db.query(User).filter(
                    User.registration_date >= datetime.utcnow() - timedelta(days=1)
                ).count(),
                "transactions_last_24h": db.query(Transaction).filter(
                    Transaction.created_at >= datetime.utcnow() - timedelta(days=1)
                ).count()
            },
            "system_load": {
                "avg_transaction_time": db.query(
                    func.avg(func.extract('epoch', func.now() - Transaction.created_at))
                ).scalar() or 0
            }
        }
