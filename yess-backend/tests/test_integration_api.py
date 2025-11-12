"""
Интеграционные тесты для API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.fixture
def client():
    """Фикстура для тестового клиента"""
    return TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Создание тестового пользователя"""
    user = User(
        phone="+996700000001",
        password_hash=AuthService.get_password_hash("TestPassword123!"),
        email="test@example.com",
        first_name="Test",
        last_name="User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(client, test_user):
    """Получение токена для аутентификации"""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.phone,
            "password": "TestPassword123!"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class TestAuthAPI:
    """Тесты для API аутентификации"""
    
    def test_register_user_success(self, client, db_session):
        """Тест успешной регистрации пользователя"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "phone": "+996700000002",
                "password": "TestPassword123!",
                "first_name": "New",
                "last_name": "User",
                "email": "newuser@example.com"
            }
        )
        
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert "access_token" in data or "user" in data
    
    def test_register_user_duplicate_phone(self, client, db_session, test_user):
        """Тест регистрации с существующим телефоном"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "phone": test_user.phone,
                "password": "TestPassword123!",
                "first_name": "Duplicate",
                "last_name": "User",
                "email": "duplicate@example.com"
            }
        )
        
        assert response.status_code == 400
    
    def test_login_success(self, client, test_user):
        """Тест успешного входа"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.phone,
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_user):
        """Тест входа с неверным паролем"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.phone,
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Тест входа несуществующего пользователя"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "+996700000999",
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == 401


class TestUserAPI:
    """Тесты для API пользователей"""
    
    def test_get_current_user(self, client, auth_token):
        """Тест получения текущего пользователя"""
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "phone" in data
    
    def test_get_current_user_no_token(self, client):
        """Тест получения пользователя без токена"""
        response = client.get("/api/v1/users/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client):
        """Тест получения пользователя с невалидным токеном"""
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401


class TestHealthCheck:
    """Тесты для health check endpoints"""
    
    def test_health_check(self, client):
        """Тест общего health check"""
        response = client.get("/health")
        
        assert response.status_code in [200, 503]  # Может быть 503 если БД не подключена
        data = response.json()
        assert "status" in data
        assert "service" in data
    
    def test_health_check_db(self, client):
        """Тест health check базы данных"""
        response = client.get("/health/db")
        
        # Может быть 200 или 503 в зависимости от подключения БД
        assert response.status_code in [200, 503]


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

