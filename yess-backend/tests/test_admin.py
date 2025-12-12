import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from src.Admin.services import (
    AdminAuthService, 
    AdminDashboardService, 
    AdminUserManagementService
)
from src.Admin.security import AdminSecurityManager
from src.models.user import User
from src.models.transaction import Transaction

class TestAdminServices:
    @pytest.fixture
    def db_session(self):
        """Создание тестовой сессии базы данных"""
        # В реальном проекте используйте test database
        session = Session()
        yield session
        session.close()

    def test_admin_authentication(self, db_session):
        """Тест аутентификации администратора"""
        # Создание тестового администратора
        username = "test_admin"
        password = "StrongPassword123!"
        hashed_password = AdminSecurityManager.get_password_hash(password)
        
        admin_user = User( # Changed from AdminUser to User
            username=username,
            email="admin@test.com",
            password_hash=hashed_password,
            is_superadmin=True
        )
        db_session.add(admin_user)
        db_session.commit()

        # Тест успешной аутентификации
        result = AdminAuthService.authenticate_admin(db_session, username, password)
        assert result is not None
        assert result.username == username

        # Тест неудачной аутентификации
        failed_result = AdminAuthService.authenticate_admin(db_session, username, "wrong_password")
        assert failed_result is None

    def test_user_management(self, db_session):
        """Тест управления пользователями"""
        # Создание тестовых пользователей
        for i in range(50):
            user = User(
                username=f"test_user_{i}",
                email=f"user_{i}@test.com",
                registration_date=datetime.utcnow() - timedelta(days=i)
            )
            db_session.add(user)
        db_session.commit()

        # Тест листинга пользователей
        result = AdminUserManagementService.list_users(db_session)
        assert result['total'] >= 50
        assert len(result['users']) == 50

        # Тест блокировки пользователя
        user_to_block = db_session.query(User).first()
        block_result = AdminUserManagementService.block_user(
            db_session, 
            user_to_block.id, 
            admin_id=1  # ID тестового администратора
        )
        assert block_result is True

        blocked_user = db_session.query(User).get(user_to_block.id)
        assert blocked_user.is_active is False

    def test_dashboard_metrics(self, db_session):
        """Тест метрик dashboard"""
        # Создание тестовых транзакций
        for i in range(100):
            transaction = Transaction(
                amount=100.0 * (i + 1),
                created_at=datetime.utcnow() - timedelta(days=i)
            )
            db_session.add(transaction)
        db_session.commit()

        # Получение метрик
        metrics = AdminDashboardService.get_global_dashboard(db_session)
        
        assert 'total_users' in metrics
        assert 'total_partners' in metrics
        assert 'total_transactions' in metrics
        assert 'total_revenue' in metrics
        assert metrics['total_transactions'] >= 100

    def test_password_complexity(self):
        """Тест проверки сложности пароля"""
        # Слабые пароли
        weak_passwords = [
            "short",
            "onlylowercase",
            "ONLYUPPERCASE",
            "12345678"
        ]

        # Сильные пароли
        strong_passwords = [
            "StrongP@ssw0rd123!",
            "Secure_P@ssw0rd_2023!",
            "ComplexPassword_123#"
        ]

        for password in weak_passwords:
            assert AdminSecurityManager.check_password_complexity(password) is False

        for password in strong_passwords:
            assert AdminSecurityManager.check_password_complexity(password) is True

    def test_token_generation(self, db_session):
        """Тест генерации и валидации токенов"""
        admin_user = User( # Changed from AdminUser to User
            username="token_test_admin",
            email="token_admin@test.com",
            password_hash=AdminSecurityManager.get_password_hash("TestPassword123!")
        )
        db_session.add(admin_user)
        db_session.commit()

        # Создание токена
        token_data = {"sub": admin_user.username}
        token = AdminSecurityManager.create_access_token(token_data)
        
        # Валидация токена
        payload = AdminSecurityManager.validate_token(token)
        assert payload is not None
        assert payload['sub'] == admin_user.username
