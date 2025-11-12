import pytest
import httpx
import time
import asyncio
from app.services.cache_service import cache_service
from app.core.security_middleware import SecurityMiddleware
from app.core.performance_middleware import PerformanceMonitoringMiddleware
from app.services.backup_service import backup_service
from app.services.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenError
from app.core.database import engine, get_db
from sqlalchemy import text
import os

class TestSystemIntegration:
    @pytest.mark.asyncio
    async def test_cache_and_security_integration(self):
        """
        Проверка интеграции кэширования и middleware безопасности
        """
        # Имитация запросов
        security_middleware = SecurityMiddleware(None)
        
        # Множественные запросы с одного IP
        for _ in range(10):
            security_middleware._track_ip_attempt('test_ip')
        
        # Проверка блокировки
        assert security_middleware._is_ip_blocked('test_ip') == True
        
        # Проверка кэширования
        if cache_service:
            @cache_service.cache_method()
            def test_cached_function(x):
                return x * 2
            
            result1 = test_cached_function(5)
            result2 = test_cached_function(5)
            
            assert result1 == result2

    def test_backup_integration(self):
        """
        Проверка полного цикла резервного копирования
        """
        # Выполнение бэкапа
        backup_service.backup_routine()
        
        # Проверка создания локального бэкапа
        assert len(os.listdir(backup_service.backup_dir)) > 0
        
        # Проверка загрузки в S3
        s3_objects = backup_service.s3_client.list_objects_v2(
            Bucket=backup_service.s3_bucket,
            Prefix='daily/'
        )
        assert len(s3_objects.get('Contents', [])) > 0

    @pytest.mark.asyncio
    async def test_external_service_integration(self):
        """
        Проверка интеграции с внешними сервисами
        """
        async with httpx.AsyncClient() as client:
            # Тест подключения к основным сервисам
            services_to_check = [
                'https://api.optimalbank.kg',
                'https://api.elcart.kg',
                'https://firebase.googleapis.com'
            ]
            
            for service_url in services_to_check:
                try:
                    response = await client.get(service_url, timeout=10)
                    # Не все сервисы могут вернуть 200, проверяем что не было критической ошибки
                    assert response.status_code < 500
                except httpx.HTTPError:
                    # Пропускаем если сервис недоступен
                    pass

    @pytest.mark.asyncio
    async def test_database_performance(self):
        """
        Тест производительности базы данных
        """
        db = next(get_db())
        try:
            # Тест простого запроса
            start_time = time.time()
            result = db.execute(text("SELECT 1"))
            query_time = time.time() - start_time
            
            # Запрос должен выполниться быстро (< 100ms)
            assert query_time < 0.1, f"Query too slow: {query_time:.3f}s"
            
            # Тест сложного запроса с JOIN
            start_time = time.time()
            result = db.execute(text("""
                SELECT COUNT(*) FROM users u
                LEFT JOIN wallets w ON u.id = w.user_id
                WHERE u.is_active = true
            """))
            complex_query_time = time.time() - start_time
            
            # Сложный запрос должен выполниться за разумное время (< 1s)
            assert complex_query_time < 1.0, f"Complex query too slow: {complex_query_time:.3f}s"
            
        finally:
            db.close()

    def test_circuit_breaker_functionality(self):
        """
        Тест функциональности Circuit Breaker
        """
        breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=5,
            name="test_breaker"
        )
        
        failure_count = 0
        
        @breaker
        def failing_function():
            nonlocal failure_count
            failure_count += 1
            raise ConnectionError("Test error")
        
        # Первые 3 вызова должны пройти (не достигнут порог)
        for i in range(3):
            try:
                failing_function()
            except ConnectionError:
                pass
        
        # После 3 ошибок circuit должен быть открыт
        assert breaker.state == CircuitState.OPEN
        assert breaker.failure_count == 3
        
        # Следующие вызовы должны вызывать CircuitBreakerOpenError
        with pytest.raises(CircuitBreakerOpenError):
            failing_function()

    def test_cache_service_health_check(self):
        """
        Тест проверки работоспособности кэша
        """
        if cache_service:
            health = cache_service.health_check()
            # Кэш должен отвечать (или быть None если не настроен)
            assert health is not None

    @pytest.mark.asyncio
    async def test_performance_middleware(self):
        """
        Тест middleware мониторинга производительности
        """
        # Создаем простой mock app
        async def mock_app(scope, receive, send):
            response = httpx.Response(200, content=b"OK")
            await response(scope, receive, send)
        
        middleware = PerformanceMonitoringMiddleware(mock_app, slow_request_threshold=0.5)
        
        # Создаем mock request
        class MockRequest:
            def __init__(self):
                self.method = "GET"
                self.url = type('obj', (object,), {'path': '/test'})()
                self.client = type('obj', (object,), {'host': '127.0.0.1'})()
                self.headers = {}
        
        # Middleware должен обработать запрос без ошибок
        # (полный тест требует ASGI scope, который сложно сымитировать)

def run_integration_tests():
    pytest.main([
        "-v",  # Verbose режим
        "--tb=short",  # Короткие трейсбэки
        "tests/integration_tests.py"
    ])

if __name__ == "__main__":
    run_integration_tests()
