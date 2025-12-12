import asyncio
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    ACHIEVEMENT = "achievement"
    BONUS_EARNED = "bonus_earned"
    PAYMENT_SUCCESS = "payment_success"
    REFERRAL_BONUS = "referral_bonus"
    PARTNER_OFFER = "partner_offer"
    SYSTEM_UPDATE = "system_update"
    REMINDER = "reminder"

class NotificationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class Notification:
    id: str
    user_id: int
    type: NotificationType
    title: str
    message: str
    data: Dict[str, Any]
    priority: NotificationPriority
    scheduled_at: Optional[float] = None
    sent_at: Optional[float] = None
    read_at: Optional[float] = None

class PushNotificationService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.firebase_config = {
            "server_key": "YOUR_FIREBASE_SERVER_KEY",
            "project_id": "yess-loyalty-app",
            "api_url": "https://fcm.googleapis.com/fcm/send"
        }
        
    async def send_notification(self, notification: Notification) -> bool:
        """
        Отправка push-уведомления
        """
        try:
            # Получение токенов устройств пользователя
            device_tokens = await self.get_user_device_tokens(notification.user_id)
            
            if not device_tokens:
                logger.warning(f"No device tokens found for user {notification.user_id}")
                return False
            
            # Подготовка данных для Firebase
            firebase_data = {
                "registration_ids": device_tokens,
                "notification": {
                    "title": notification.title,
                    "body": notification.message,
                    "icon": self.get_notification_icon(notification.type),
                    "sound": "default",
                    "click_action": self.get_click_action(notification.type)
                },
                "data": {
                    "type": notification.type.value,
                    "priority": notification.priority.value,
                    "notification_id": notification.id,
                    **notification.data
                },
                "priority": "high" if notification.priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else "normal"
            }
            
            # Отправка через Firebase
            success = await self.send_firebase_notification(firebase_data)
            
            if success:
                # Сохранение уведомления в базе данных
                await self.save_notification(notification)
                logger.info(f"Notification sent successfully to user {notification.user_id}")
                return True
            else:
                logger.error(f"Failed to send notification to user {notification.user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def send_firebase_notification(self, data: Dict[str, Any]) -> bool:
        """
        Отправка уведомления через Firebase Cloud Messaging
        """
        try:
            headers = {
                "Authorization": f"key={self.firebase_config['server_key']}",
                "Content-Type": "application/json"
            }
            
            # В реальном приложении здесь будет HTTP запрос к Firebase
            # response = requests.post(self.firebase_config["api_url"], 
            #                        headers=headers, 
            #                        data=json.dumps(data))
            
            # Симуляция успешной отправки
            await asyncio.sleep(0.1)
            logger.info(f"Firebase notification sent: {data['notification']['title']}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending Firebase notification: {e}")
            return False
    
    async def get_user_device_tokens(self, user_id: int) -> List[str]:
        """
        Получение токенов устройств пользователя
        """
        try:
            query = text("""
                SELECT device_token 
                FROM user_devices 
                WHERE user_id = :user_id AND is_active = true
            """)
            
            results = self.db.execute(query, {"user_id": user_id}).fetchall()
            return [row[0] for row in results]
            
        except Exception as e:
            logger.error(f"Error getting device tokens: {e}")
            return []
    
    def get_notification_icon(self, notification_type: NotificationType) -> str:
        """
        Получение иконки для типа уведомления
        """
        icons = {
            NotificationType.ACHIEVEMENT: "🏆",
            NotificationType.BONUS_EARNED: "💰",
            NotificationType.PAYMENT_SUCCESS: "✅",
            NotificationType.REFERRAL_BONUS: "👥",
            NotificationType.PARTNER_OFFER: "🎁",
            NotificationType.SYSTEM_UPDATE: "📱",
            NotificationType.REMINDER: "⏰"
        }
        return icons.get(notification_type, "📢")
    
    def get_click_action(self, notification_type: NotificationType) -> str:
        """
        Получение действия при клике на уведомление
        """
        actions = {
            NotificationType.ACHIEVEMENT: "OPEN_ACHIEVEMENTS",
            NotificationType.BONUS_EARNED: "OPEN_WALLET",
            NotificationType.PAYMENT_SUCCESS: "OPEN_WALLET",
            NotificationType.REFERRAL_BONUS: "OPEN_REFERRAL",
            NotificationType.PARTNER_OFFER: "OPEN_PARTNERS",
            NotificationType.SYSTEM_UPDATE: "OPEN_SETTINGS",
            NotificationType.REMINDER: "OPEN_APP"
        }
        return actions.get(notification_type, "OPEN_APP")
    
    async def save_notification(self, notification: Notification):
        """
        Сохранение уведомления в базе данных
        """
        try:
            query = text("""
                INSERT INTO notifications (
                    id, user_id, type, title, message, data, 
                    priority, scheduled_at, sent_at
                ) VALUES (
                    :id, :user_id, :type, :title, :message, :data,
                    :priority, :scheduled_at, :sent_at
                )
            """)
            
            self.db.execute(query, {
                "id": notification.id,
                "user_id": notification.user_id,
                "type": notification.type.value,
                "title": notification.title,
                "message": notification.message,
                "data": json.dumps(notification.data),
                "priority": notification.priority.value,
                "scheduled_at": notification.scheduled_at,
                "sent_at": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error saving notification: {e}")
    
    async def send_achievement_notification(self, user_id: int, achievement_name: str, points: int):
        """
        Отправка уведомления о достижении
        """
        notification = Notification(
            id=f"achievement_{int(time.time())}",
            user_id=user_id,
            type=NotificationType.ACHIEVEMENT,
            title="🏆 Достижение разблокировано!",
            message=f"Поздравляем! Вы получили достижение '{achievement_name}' и заработали {points} очков!",
            data={"achievement_name": achievement_name, "points": points},
            priority=NotificationPriority.HIGH
        )
        
        return await self.send_notification(notification)
    
    async def send_bonus_notification(self, user_id: int, amount: float, source: str):
        """
        Отправка уведомления о начислении бонуса
        """
        notification = Notification(
            id=f"bonus_{int(time.time())}",
            user_id=user_id,
            type=NotificationType.BONUS_EARNED,
            title="💰 Бонус начислен!",
            message=f"Вам начислен бонус {amount} сом за {source}",
            data={"amount": amount, "source": source},
            priority=NotificationPriority.MEDIUM
        )
        
        return await self.send_notification(notification)
    
    async def send_payment_notification(self, user_id: int, amount: float, status: str):
        """
        Отправка уведомления о платеже
        """
        if status == "success":
            notification = Notification(
                id=f"payment_{int(time.time())}",
                user_id=user_id,
                type=NotificationType.PAYMENT_SUCCESS,
                title="✅ Платеж успешен!",
                message=f"Ваш баланс пополнен на {amount} сом",
                data={"amount": amount, "status": status},
                priority=NotificationPriority.HIGH
            )
        else:
            notification = Notification(
                id=f"payment_{int(time.time())}",
                user_id=user_id,
                type=NotificationType.PAYMENT_SUCCESS,
                title="❌ Платеж не удался",
                message="Произошла ошибка при обработке платежа",
                data={"amount": amount, "status": status},
                priority=NotificationPriority.HIGH
            )
        
        return await self.send_notification(notification)
    
    async def send_referral_notification(self, user_id: int, referred_user: str, bonus: float):
        """
        Отправка уведомления о реферальном бонусе
        """
        notification = Notification(
            id=f"referral_{int(time.time())}",
            user_id=user_id,
            type=NotificationType.REFERRAL_BONUS,
            title="👥 Реферальный бонус!",
            message=f"Ваш друг {referred_user} зарегистрировался! Вам начислен бонус {bonus} сом",
            data={"referred_user": referred_user, "bonus": bonus},
            priority=NotificationPriority.MEDIUM
        )
        
        return await self.send_notification(notification)
    
    async def send_partner_offer_notification(self, user_id: int, partner_name: str, offer: str):
        """
        Отправка уведомления о предложении партнера
        """
        notification = Notification(
            id=f"offer_{int(time.time())}",
            user_id=user_id,
            type=NotificationType.PARTNER_OFFER,
            title="🎁 Специальное предложение!",
            message=f"{partner_name}: {offer}",
            data={"partner_name": partner_name, "offer": offer},
            priority=NotificationPriority.LOW
        )
        
        return await self.send_notification(notification)
    
    async def schedule_notification(self, notification: Notification, delay_seconds: int):
        """
        Планирование уведомления на будущее время
        """
        try:
            notification.scheduled_at = time.time() + delay_seconds
            
            query = text("""
                INSERT INTO scheduled_notifications (
                    id, user_id, type, title, message, data,
                    priority, scheduled_at
                ) VALUES (
                    :id, :user_id, :type, :title, :message, :data,
                    :priority, :scheduled_at
                )
            """)
            
            self.db.execute(query, {
                "id": notification.id,
                "user_id": notification.user_id,
                "type": notification.type.value,
                "title": notification.title,
                "message": notification.message,
                "data": json.dumps(notification.data),
                "priority": notification.priority.value,
                "scheduled_at": notification.scheduled_at
            })
            
            logger.info(f"Notification scheduled for user {notification.user_id} at {notification.scheduled_at}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling notification: {e}")
            return False
    
    async def process_scheduled_notifications(self):
        """
        Обработка запланированных уведомлений
        """
        try:
            current_time = time.time()
            
            query = text("""
                SELECT id, user_id, type, title, message, data, priority
                FROM scheduled_notifications
                WHERE scheduled_at <= :current_time AND sent_at IS NULL
                ORDER BY scheduled_at ASC
                LIMIT 100
            """)
            
            results = self.db.execute(query, {"current_time": current_time}).fetchall()
            
            for row in results:
                notification = Notification(
                    id=row[0],
                    user_id=row[1],
                    type=NotificationType(row[2]),
                    title=row[3],
                    message=row[4],
                    data=json.loads(row[5]),
                    priority=NotificationPriority(row[6])
                )
                
                # Отправка уведомления
                success = await self.send_notification(notification)
                
                if success:
                    # Отметка как отправленное
                    update_query = text("""
                        UPDATE scheduled_notifications 
                        SET sent_at = :sent_at 
                        WHERE id = :id
                    """)
                    
                    self.db.execute(update_query, {
                        "sent_at": time.time(),
                        "id": notification.id
                    })
            
        except Exception as e:
            logger.error(f"Error processing scheduled notifications: {e}")
    
    async def get_user_notifications(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Получение уведомлений пользователя
        """
        try:
            query = text("""
                SELECT 
                    id, type, title, message, data, priority,
                    sent_at, read_at
                FROM notifications
                WHERE user_id = :user_id
                ORDER BY sent_at DESC
                LIMIT :limit
            """)
            
            results = self.db.execute(query, {"user_id": user_id, "limit": limit}).fetchall()
            
            notifications = []
            for row in results:
                notifications.append({
                    "id": row[0],
                    "type": row[1],
                    "title": row[2],
                    "message": row[3],
                    "data": json.loads(row[4]),
                    "priority": row[5],
                    "sent_at": row[6],
                    "read_at": row[7],
                    "is_read": row[7] is not None
                })
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error getting user notifications: {e}")
            return []
    
    async def mark_notification_as_read(self, notification_id: str, user_id: int) -> bool:
        """
        Отметка уведомления как прочитанного
        """
        try:
            query = text("""
                UPDATE notifications 
                SET read_at = :read_at 
                WHERE id = :id AND user_id = :user_id
            """)
            
            self.db.execute(query, {
                "read_at": time.time(),
                "id": notification_id,
                "user_id": user_id
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False

# Глобальный экземпляр сервиса уведомлений
push_notification_service = PushNotificationService(None)  # Будет инициализирован с реальной сессией БД
