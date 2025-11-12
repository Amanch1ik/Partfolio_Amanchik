"""
Notification Services: SMS & Push
"""
import logging
from typing import Optional, Dict, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """SMS уведомления через Twilio (для КР номеров)"""
    
    def __init__(self):
        self.enabled = settings.SMS_ENABLED
        self.client = None
        
        if self.enabled:
            try:
                from twilio.rest import Client
                self.client = Client(
                    settings.TWILIO_ACCOUNT_SID,
                    settings.TWILIO_AUTH_TOKEN
                )
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {str(e)}")
                self.enabled = False
    
    async def send_sms(self, phone: str, message: str) -> bool:
        """
        Отправка SMS
        phone: номер в формате +996XXXXXXXXX
        """
        if not self.enabled:
            logger.warning(f"SMS disabled. Would send to {phone}: {message}")
            return False
        
        try:
            # Форматируем номер для КР
            if not phone.startswith('+'):
                phone = f"+996{phone}"
            
            message_instance = self.client.messages.create(
                to=phone,
                from_=settings.TWILIO_PHONE_NUMBER,
                body=message
            )
            
            logger.info(f"SMS sent successfully. SID: {message_instance.sid}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone}: {str(e)}")
            return False
    
    async def send_verification_code(self, phone: str, code: str) -> bool:
        """Отправка кода верификации"""
        message = f"Ваш код подтверждения YESS: {code}. Не сообщайте его никому!"
        return await self.send_sms(phone, message)
    
    async def send_transaction_notification(
        self, 
        phone: str, 
        amount: float, 
        transaction_type: str
    ) -> bool:
        """Уведомление о транзакции"""
        message = f"YESS: {transaction_type} на сумму {amount} сом успешно выполнена."
        return await self.send_sms(phone, message)
    
    async def send_bonus_notification(self, phone: str, bonus_amount: float) -> bool:
        """Уведомление о начислении бонусов"""
        message = f"YESS: Вам начислено {bonus_amount} YesCoin! Используйте их у партнёров."
        return await self.send_sms(phone, message)


class PushNotificationService:
    """Push уведомления через Firebase Cloud Messaging"""
    
    def __init__(self):
        self.enabled = settings.PUSH_ENABLED
        self.app = None
        
        if self.enabled:
            try:
                import firebase_admin
                from firebase_admin import credentials
                
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                self.app = firebase_admin.initialize_app(cred)
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {str(e)}")
                self.enabled = False
    
    async def send_push(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> int:
        """
        Отправка push уведомления
        Возвращает количество успешно отправленных
        """
        if not self.enabled:
            logger.warning(f"Push disabled. Would send: {title} - {body}")
            return 0
        
        try:
            from firebase_admin import messaging
            
            # Создаем сообщение
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=device_tokens
            )
            
            # Отправляем
            response = messaging.send_multicast(message)
            
            logger.info(
                f"Push sent: {response.success_count} success, "
                f"{response.failure_count} failures"
            )
            
            return response.success_count
        
        except Exception as e:
            logger.error(f"Failed to send push notification: {str(e)}")
            return 0
    
    async def send_transaction_push(
        self,
        device_tokens: List[str],
        amount: float,
        transaction_type: str
    ) -> int:
        """Push уведомление о транзакции"""
        return await self.send_push(
            device_tokens=device_tokens,
            title="Транзакция YESS",
            body=f"{transaction_type} на сумму {amount} сом",
            data={
                "type": "transaction",
                "amount": str(amount),
                "transaction_type": transaction_type
            }
        )
    
    async def send_bonus_push(
        self,
        device_tokens: List[str],
        bonus_amount: float
    ) -> int:
        """Push уведомление о бонусах"""
        return await self.send_push(
            device_tokens=device_tokens,
            title="Бонусы YESS!",
            body=f"Вам начислено {bonus_amount} YesCoin",
            data={
                "type": "bonus",
                "amount": str(bonus_amount)
            }
        )
    
    async def send_promo_push(
        self,
        device_tokens: List[str],
        partner_name: str,
        discount: int
    ) -> int:
        """Push уведомление о промо-акции"""
        return await self.send_push(
            device_tokens=device_tokens,
            title=f"Акция от {partner_name}!",
            body=f"Скидка {discount}% только сегодня!",
            data={
                "type": "promo",
                "partner": partner_name,
                "discount": str(discount)
            }
        )


# Singleton instances
sms_service = SMSService()
push_service = PushNotificationService()

