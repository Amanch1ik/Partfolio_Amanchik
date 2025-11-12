"""
Нагрузочное тестирование с использованием Locust (базовая версия)
Для запуска: locust -f tests/load_testing.py --host=http://localhost:8000

Для тестирования 4000+ пользователей используйте: load_testing_4000_users.py
"""
from locust import HttpUser, task, between, events
import random
import json

class YessLoyaltyUser(HttpUser):
    """
    Класс для имитации поведения пользователя приложения
    """
    wait_time = between(1, 3)  # Время ожидания между запросами
    
    def on_start(self):
        """Выполняется при старте каждого виртуального пользователя"""
        # Регистрация/авторизация
        self.login()
    
    def login(self):
        """Авторизация пользователя"""
        login_data = {
            "phone": f"+996{random.randint(500000000, 999999999)}",
            "password": "test_password"
        }
        
        with self.client.post(
            "/api/v1/auth/login",
            json=login_data,
            catch_response=True,
            name="Login"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code}")
                self.token = None
    
    @task(3)
    def view_partners(self):
        """Просмотр списка партнеров (частая операция)"""
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        with self.client.get(
            "/api/v1/partners",
            headers=headers,
            name="Get Partners",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(2)
    def view_user_profile(self):
        """Просмотр профиля пользователя"""
        if not self.token:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with self.client.get(
            "/api/v1/users/me",
            headers=headers,
            name="Get User Profile",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get profile: {response.status_code}")
    
    @task(1)
    def create_transaction(self):
        """Создание транзакции (менее частая операция)"""
        if not self.token:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        transaction_data = {
            "amount": random.uniform(100, 5000),
            "type": "topup"
        }
        
        with self.client.post(
            "/api/v1/transactions",
            json=transaction_data,
            headers=headers,
            name="Create Transaction",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201, 400]:
                response.success()
            else:
                response.failure(f"Transaction failed: {response.status_code}")
    
    @task(2)
    def get_nearby_partners(self):
        """Поиск партнеров рядом"""
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        # Координаты Бишкека
        params = {
            "latitude": 42.8746 + random.uniform(-0.1, 0.1),
            "longitude": 74.5698 + random.uniform(-0.1, 0.1),
            "radius": random.randint(1, 10)
        }
        
        with self.client.get(
            "/api/v1/partners/nearby",
            params=params,
            headers=headers,
            name="Get Nearby Partners",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Failed to get nearby partners: {response.status_code}")
    
    @task(1)
    def view_transaction_history(self):
        """Просмотр истории транзакций"""
        if not self.token:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with self.client.get(
            "/api/v1/transactions",
            headers=headers,
            name="Get Transaction History",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Failed to get transactions: {response.status_code}")


class AdminUser(HttpUser):
    """
    Класс для имитации поведения администратора
    """
    wait_time = between(2, 5)
    weight = 1  # Меньше администраторов чем обычных пользователей
    
    def on_start(self):
        """Авторизация администратора"""
        admin_data = {
            "email": "admin@yess.kg",
            "password": "admin_password"
        }
        
        with self.client.post(
            "/api/v1/admin/login",
            json=admin_data,
            catch_response=True,
            name="Admin Login"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                response.failure(f"Admin login failed: {response.status_code}")
                self.token = None
    
    @task(2)
    def view_system_stats(self):
        """Просмотр статистики системы"""
        if not self.token:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with self.client.get(
            "/api/v1/admin/stats",
            headers=headers,
            name="Get System Stats",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
    
    @task(1)
    def manage_partners(self):
        """Управление партнерами"""
        if not self.token:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with self.client.get(
            "/api/v1/admin/partners",
            headers=headers,
            name="Manage Partners",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Вызывается при старте теста"""
    print("Нагрузочное тестирование начато")
    print(f"Host: {environment.host}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Вызывается при остановке теста"""
    print("Нагрузочное тестирование завершено")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Обработчик каждого запроса для дополнительной аналитики"""
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response_time > 1000:  # Более 1 секунды
        print(f"Slow request: {name} - {response_time}ms")
