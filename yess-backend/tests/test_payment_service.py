"""
Тесты для сервиса платежей
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.payment_service import PaymentService, PaymentRequest, PaymentMethod, PaymentStatus


class TestPaymentService:
    """Тесты для PaymentService"""
    
    @pytest.fixture
    def payment_service(self):
        """Создание экземпляра PaymentService"""
        return PaymentService()
    
    def test_generate_payment_id(self, payment_service):
        """Тест генерации уникального ID платежа"""
        payment_id1 = payment_service.generate_payment_id(user_id=1, amount=100.0)
        payment_id2 = payment_service.generate_payment_id(user_id=1, amount=100.0)
        payment_id3 = payment_service.generate_payment_id(user_id=2, amount=100.0)
        
        assert payment_id1 is not None
        assert isinstance(payment_id1, str)
        assert len(payment_id1) > 0
        # ID должны быть разными для разных вызовов
        assert payment_id1 != payment_id2
    
    def test_create_signature(self, payment_service):
        """Тест создания подписи для запроса"""
        data = {
            "merchant_id": "TEST_MERCHANT",
            "amount": 100.0,
            "currency": "KGS"
        }
        secret_key = "test_secret_key"
        
        signature = payment_service.create_signature(data, secret_key)
        
        assert signature is not None
        assert isinstance(signature, str)
        assert len(signature) == 64  # SHA256 hex digest length
    
    def test_create_signature_deterministic(self, payment_service):
        """Тест что подпись детерминирована"""
        data = {"amount": 100.0, "currency": "KGS"}
        secret_key = "test_secret"
        
        sig1 = payment_service.create_signature(data, secret_key)
        sig2 = payment_service.create_signature(data, secret_key)
        
        assert sig1 == sig2
    
    @pytest.mark.asyncio
    async def test_process_payment_success(self, payment_service):
        """Тест успешной обработки платежа"""
        payment_request = PaymentRequest(
            user_id=1,
            amount=100.0,
            currency="KGS",
            payment_method=PaymentMethod.OPTIMA_BANK,
            description="Test payment"
        )
        
        # Мокаем отправку запроса
        with patch.object(payment_service, 'send_payment_request', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {
                "success": True,
                "redirect_url": "https://payment.example.com/pay/123",
                "qr_code": "data:image/png;base64,..."
            }
            
            response = await payment_service.process_payment(payment_request)
            
            assert response is not None
            assert response.status == PaymentStatus.PROCESSING
            assert response.payment_id is not None
            assert response.redirect_url is not None
    
    @pytest.mark.asyncio
    async def test_process_payment_failure(self, payment_service):
        """Тест обработки неудачного платежа"""
        payment_request = PaymentRequest(
            user_id=1,
            amount=100.0,
            currency="KGS",
            payment_method=PaymentMethod.OPTIMA_BANK
        )
        
        with patch.object(payment_service, 'send_payment_request', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {
                "success": False,
                "error": "Insufficient funds"
            }
            
            response = await payment_service.process_payment(payment_request)
            
            assert response is not None
            assert response.status == PaymentStatus.FAILED
            assert response.error_message is not None
    
    def test_payment_configs_loaded(self, payment_service):
        """Тест что конфигурации платежных систем загружены"""
        assert PaymentMethod.OPTIMA_BANK in payment_service.payment_configs
        assert PaymentMethod.DEMIR_BANK in payment_service.payment_configs
        assert PaymentMethod.BAKAI_BANK in payment_service.payment_configs
        
        config = payment_service.payment_configs[PaymentMethod.OPTIMA_BANK]
        assert "api_url" in config
        assert "merchant_id" in config
        assert "secret_key" in config
    
    @pytest.mark.asyncio
    async def test_check_payment_status(self, payment_service):
        """Тест проверки статуса платежа"""
        payment_id = "test_payment_123"
        
        with patch.object(payment_service, 'send_status_request', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {
                "success": True,
                "status": "completed",
                "amount": 100.0
            }
            
            status = await payment_service.check_payment_status(payment_id, PaymentMethod.OPTIMA_BANK)
            
            assert status is not None
            assert isinstance(status, PaymentStatus)
            assert status == PaymentStatus.COMPLETED

