"""
Скрипт для тестирования API аутентификации
"""
import requests
import json
from datetime import datetime

# Базовый URL API
BASE_URL = "http://localhost:8000/api/v1"

def print_response(title, response):
    """Вывод красивого ответа"""
    print(f"\n{'='*50}")
    print(f"{title}")
    print(f"{'='*50}")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    try:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except:
        print(response.text)
    print(f"{'='*50}\n")

def test_register():
    """Тест регистрации пользователя"""
    url = f"{BASE_URL}/auth/register"
    
    # Генерируем уникальный номер телефона
    timestamp = datetime.now().strftime("%H%M%S")
    phone = f"+996555{timestamp}"
    
    data = {
        "phone_number": phone,
        "password": "test_password_123",
        "first_name": "Тест",
        "last_name": "Пользователь"
    }
    
    print(f"📝 Регистрация пользователя с номером: {phone}")
    response = requests.post(url, json=data)
    print_response("✅ РЕГИСТРАЦИЯ", response)
    
    if response.status_code == 200:
        return phone, data["password"]
    return None, None

def test_login(phone, password):
    """Тест входа пользователя"""
    url = f"{BASE_URL}/auth/login"
    
    data = {
        "username": phone,
        "password": password
    }
    
    print(f"🔐 Вход пользователя: {phone}")
    response = requests.post(url, data=data)  # OAuth2 требует form-data
    print_response("✅ ВХОД (LOGIN)", response)
    
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_get_me(token):
    """Тест получения данных текущего пользователя"""
    url = f"{BASE_URL}/auth/me"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"👤 Получение данных текущего пользователя")
    response = requests.get(url, headers=headers)
    print_response("✅ ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ (/auth/me)", response)
    
    return response.status_code == 200

def test_invalid_token():
    """Тест с невалидным токеном"""
    url = f"{BASE_URL}/auth/me"
    
    headers = {
        "Authorization": "Bearer invalid_token_12345"
    }
    
    print(f"❌ Попытка доступа с невалидным токеном")
    response = requests.get(url, headers=headers)
    print_response("❌ ОШИБКА (ожидается 401)", response)
    
    return response.status_code == 401

def test_login_wrong_password(phone):
    """Тест входа с неверным паролем"""
    url = f"{BASE_URL}/auth/login"
    
    data = {
        "username": phone,
        "password": "wrong_password_123"
    }
    
    print(f"❌ Попытка входа с неверным паролем")
    response = requests.post(url, data=data)
    print_response("❌ ОШИБКА (ожидается 401)", response)
    
    return response.status_code == 401

def main():
    """Запуск всех тестов"""
    print("\n" + "="*60)
    print("🚀 ТЕСТИРОВАНИЕ API АУТЕНТИФИКАЦИИ")
    print("="*60)
    
    # Проверка доступности сервера
    try:
        response = requests.get(f"http://localhost:8000/")
        print(f"✅ Сервер доступен")
    except:
        print(f"❌ ОШИБКА: Сервер недоступен!")
        print(f"Убедитесь, что сервер запущен: python -m uvicorn app.main:app --reload")
        return
    
    # Тест 1: Регистрация
    phone, password = test_register()
    if not phone:
        print("❌ Регистрация не удалась. Остановка тестов.")
        return
    
    # Тест 2: Вход
    token = test_login(phone, password)
    if not token:
        print("❌ Вход не удался. Остановка тестов.")
        return
    
    # Тест 3: Получение данных текущего пользователя
    if not test_get_me(token):
        print("❌ Не удалось получить данные текущего пользователя.")
        return
    
    # Тест 4: Невалидный токен
    test_invalid_token()
    
    # Тест 5: Неверный пароль
    test_login_wrong_password(phone)
    
    print("\n" + "="*60)
    print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

