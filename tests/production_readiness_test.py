import pytest
import requests
from typing import Dict, Any
import json
import os
import time

class ProductionReadinessTest:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def test_system_health(self):
        """Проверка общего статуса системы"""
        response = requests.get(f"{self.base_url}/health", headers=self.headers)
        assert response.status_code == 200, "Система не готова к работе"
        
        health_data = response.json()
        assert health_data.get('status') == 'ok', "Статус системы не в порядке"

    def test_critical_services(self):
        """Проверка критических сервисов"""
        services_to_check = [
            'database',
            'cache',
            'authentication',
            'payment_gateway'
        ]

        response = requests.get(f"{self.base_url}/services/status", headers=self.headers)
        assert response.status_code == 200, "Не удалось получить статус сервисов"
        
        services_status = response.json()
        for service in services_to_check:
            assert services_status.get(service) == 'healthy', f"Сервис {service} не работает"

    def test_performance_baseline(self):
        """Базовая проверка производительности"""
        # Тестовый эндпоинт с замером времени ответа
        start_time = time.time()
        response = requests.get(f"{self.base_url}/performance/test", headers=self.headers)
        end_time = time.time()
        
        assert response.status_code == 200, "Тест производительности не пройден"
        
        response_time = end_time - start_time
        assert response_time < 1.0, f"Время ответа слишком медленное: {response_time} сек"

    def test_security_headers(self):
        """Проверка security-заголовков"""
        response = requests.get(self.base_url, headers=self.headers)
        
        security_headers = {
            'Strict-Transport-Security': True,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy': True
        }

        for header, expected in security_headers.items():
            assert header in response.headers, f"Отсутствует заголовок {header}"

def test_production_readiness():
    base_url = os.getenv('PRODUCTION_BASE_URL', 'https://api.yess-loyalty.com')
    readiness_test = ProductionReadinessTest(base_url)
    
    readiness_test.test_system_health()
    readiness_test.test_critical_services()
    readiness_test.test_performance_baseline()
    readiness_test.test_security_headers()

if __name__ == "__main__":
    pytest.main([__file__])
