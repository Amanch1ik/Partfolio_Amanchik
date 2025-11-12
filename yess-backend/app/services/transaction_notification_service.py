from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.core.notifications import SMSService, PushNotificationService, sms_service, push_service
from app.models.user import User
from app.models.partner import Partner
from app.models.transaction import Transaction
from app.services.push_notification_service import NotificationType, NotificationPriority

class TransactionNotificationService:
    def __init__(
        self, 
        sms_service: SMSService, 
        push_service: PushNotificationService
    ):
        self._sms_service = sms_service
        self._push_service = push_service

    async def notify_transaction(
        self, 
        user: User, 
        transaction: Transaction, 
        partner: Partner,
        db: Session
    ):
        """
        Комплексное уведомление о транзакции
        Включает SMS, Push и In-App уведомления
        """
        # Проверяем настройки уведомлений пользователя
        notification_settings = user.notification_settings

        # SMS Уведомление
        if notification_settings.sms_enabled and user.phone:
            await self._send_sms_notification(user, transaction, partner)

        # Push Уведомление
        if notification_settings.push_enabled and user.device_tokens:
            await self._send_push_notification(user, transaction, partner)

        # In-App уведомление (сохраняем в базу)
        await self._create_in_app_notification(db, user, transaction, partner)

    async def _send_sms_notification(
        self, 
        user: User, 
        transaction: Transaction, 
        partner: Partner
    ):
        """Расширенное SMS уведомление"""
        message = (
            f"YESS: Транзакция {transaction.type} в {partner.name} "
            f"на сумму {transaction.amount} сом. "
            f"Кешбэк: {transaction.yescoin_earned} YesCoin"
        )
        await self._sms_service.send_sms(user.phone, message)

    async def _send_push_notification(
        self, 
        user: User, 
        transaction: Transaction, 
        partner: Partner
    ):
        """Расширенное Push уведомление"""
        await self._push_service.send_push(
            device_tokens=user.device_tokens,
            title=f"Транзакция в {partner.name}",
            body=(
                f"{transaction.type} на {transaction.amount} сом. "
                f"Кешбэк: {transaction.yescoin_earned} YesCoin"
            ),
            data={
                "type": NotificationType.PAYMENT_SUCCESS.value,
                "transaction_id": str(transaction.id),
                "partner_id": str(partner.id),
                "partner_name": partner.name,
                "amount": str(transaction.amount),
                "cashback": str(transaction.yescoin_earned),
                "priority": NotificationPriority.MEDIUM.value
            }
        )

    async def _create_in_app_notification(
        self, 
        db: Session, 
        user: User, 
        transaction: Transaction, 
        partner: Partner
    ):
        """Создание In-App уведомления"""
        from app.models.notification import Notification

        notification = Notification(
            user_id=user.id,
            type=NotificationType.PAYMENT_SUCCESS.value,
            title=f"Транзакция в {partner.name}",
            body=(
                f"Вы совершили {transaction.type} на {transaction.amount} сом. "
                f"Начислено {transaction.yescoin_earned} YesCoin"
            ),
            data={
                "transaction_id": transaction.id,
                "partner_id": partner.id,
                "amount": transaction.amount,
                "cashback": transaction.yescoin_earned
            },
            is_read=False
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)

# Singleton
transaction_notification_service = TransactionNotificationService(
    sms_service=sms_service, 
    push_service=push_service
)
