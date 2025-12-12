import pytest
from src.core.security import SecurityManager

class TestSecurityManager:
    def test_password_hashing(self):
        """Тест хэширования и проверки пароля"""
        password = "StrongP@ssw0rd123!"
        hashed_password = SecurityManager.get_password_hash(password)
        
        assert SecurityManager.verify_password(password, hashed_password)
        assert not SecurityManager.verify_password("WrongPassword", hashed_password)

    def test_password_strength_validation(self):
        """Тест валидации сложности пароля"""
        # Слабые пароли
        weak_passwords = [
            "short",
            "onlylowercase",
            "ONLYUPPERCASE",
            "12345678",
            "weakpassword"
        ]
        
        # Сильные пароли
        strong_passwords = [
            "StrongP@ssw0rd123!",
            "Secure_P@ssw0rd_2023!",
            "ComplexPassword_123#"
        ]
        
        for password in weak_passwords:
            with pytest.raises(ValueError):
                SecurityManager.get_password_hash(password)
        
        for password in strong_passwords:
            hashed_password = SecurityManager.get_password_hash(password)
            assert hashed_password is not None

    def test_token_generation(self):
        """Тест генерации и валидации токенов"""
        user_data = {"sub": "user_123", "role": "admin"}
        
        # Создание токена
        token = SecurityManager.create_access_token(user_data)
        assert token is not None
        
        # Валидация токена
        payload = SecurityManager.validate_token(token)
        assert payload is not None
        assert payload["sub"] == "user_123"
        assert payload["role"] == "admin"

    def test_reset_token_generation(self):
        """Тест генерации токена сброса пароля"""
        user_id = "user_456"
        reset_token = SecurityManager.generate_reset_token(user_id)
        
        payload = SecurityManager.validate_token(reset_token)
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "password_reset"
