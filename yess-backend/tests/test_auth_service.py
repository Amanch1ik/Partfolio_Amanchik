"""
Unit тесты для сервиса аутентификации
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import jwt
from fastapi import HTTPException

from app.services.auth_service import AuthService
from app.models.user import User
from app.core.config import settings


class TestAuthService:
    """Тесты для AuthService"""
    
    def test_verify_password_success(self):
        """Тест успешной проверки пароля"""
        password = "TestPassword123!"
        hashed = AuthService.get_password_hash(password)
        
        assert AuthService.verify_password(password, hashed) is True
    
    def test_verify_password_failure(self):
        """Тест неудачной проверки пароля"""
        password = "TestPassword123!"
        wrong_password = "WrongPassword123!"
        hashed = AuthService.get_password_hash(password)
        
        assert AuthService.verify_password(wrong_password, hashed) is False
    
    def test_get_password_hash(self):
        """Тест хеширования пароля"""
        password = "TestPassword123!"
        hashed = AuthService.get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")  # bcrypt hash format
    
    def test_create_access_token(self):
        """Тест создания JWT токена"""
        data = {"sub": "123", "email": "test@example.com"}
        token = AuthService.create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Декодируем токен для проверки
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert decoded["sub"] == "123"
        assert decoded["email"] == "test@example.com"
        assert "exp" in decoded
    
    def test_create_access_token_with_expires_delta(self):
        """Тест создания токена с кастомным временем жизни"""
        data = {"sub": "123"}
        expires_delta = timedelta(minutes=60)
        token = AuthService.create_access_token(data, expires_delta=expires_delta)
        
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_time = datetime.utcnow() + expires_delta
        
        # Проверяем, что время истечения примерно правильное (с допуском в 1 секунду)
        assert abs((exp_time - expected_time).total_seconds()) < 1
    
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, db_session):
        """Тест успешной аутентификации пользователя"""
        # Создаем тестового пользователя
        test_user = User(
            phone="+996700000001",
            password_hash=AuthService.get_password_hash("TestPassword123!"),
            email="test@example.com",
            first_name="Test",
            last_name="User",
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Аутентифицируем
        user = AuthService.authenticate_user(
            db_session,
            "+996700000001",
            "TestPassword123!"
        )
        
        assert user is not None
        assert user.phone == "+996700000001"
        assert user.email == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, db_session):
        """Тест аутентификации с неверным паролем"""
        test_user = User(
            phone="+996700000001",
            password_hash=AuthService.get_password_hash("TestPassword123!"),
            email="test@example.com",
            first_name="Test",
            last_name="User"
        )
        db_session.add(test_user)
        db_session.commit()
        
        user = AuthService.authenticate_user(
            db_session,
            "+996700000001",
            "WrongPassword123!"
        )
        
        assert user is None
    
    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, db_session):
        """Тест аутентификации несуществующего пользователя"""
        user = AuthService.authenticate_user(
            db_session,
            "+996700000999",
            "TestPassword123!"
        )
        
        assert user is None


class TestGetCurrentUser:
    """Тесты для функции get_current_user"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_success(self, db_session):
        """Тест успешного получения текущего пользователя"""
        from app.services.dependencies import get_current_user
        from fastapi.security import OAuth2PasswordBearer
        
        # Создаем тестового пользователя
        test_user = User(
            phone="+996700000001",
            password_hash=AuthService.get_password_hash("TestPassword123!"),
            email="test@example.com",
            first_name="Test",
            last_name="User",
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Создаем токен
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        
        # Получаем пользователя
        user = await get_current_user(token=token, db=db_session)
        
        assert user is not None
        assert user.id == test_user.id
        assert user.phone == "+996700000001"
    
    @pytest.mark.asyncio
    async def test_get_current_user_expired_token(self, db_session):
        """Тест получения пользователя с истекшим токеном"""
        from app.services.dependencies import get_current_user
        
        # Создаем токен с истекшим временем
        expired_data = {"sub": "123", "exp": datetime.utcnow() - timedelta(hours=1)}
        expired_token = jwt.encode(expired_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=expired_token, db=db_session)
        
        assert exc_info.value.status_code == 401
        assert "истёк" in exc_info.value.detail.lower() or "expired" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, db_session):
        """Тест получения пользователя с невалидным токеном"""
        from app.services.dependencies import get_current_user
        
        invalid_token = "invalid.token.here"
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=invalid_token, db=db_session)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_inactive(self, db_session):
        """Тест получения неактивного пользователя"""
        from app.services.dependencies import get_current_user
        
        # Создаем неактивного пользователя
        test_user = User(
            phone="+996700000001",
            password_hash=AuthService.get_password_hash("TestPassword123!"),
            email="test@example.com",
            first_name="Test",
            last_name="User",
            is_active=False  # Неактивный
        )
        db_session.add(test_user)
        db_session.commit()
        
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=db_session)
        
        assert exc_info.value.status_code == 403


@pytest.fixture
def db_session():
    """Фикстура для тестовой сессии БД"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()

