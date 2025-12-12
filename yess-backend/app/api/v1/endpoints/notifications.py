"""
Полная система уведомлений для Bonus APP
Поддержка Push, SMS, Email уведомлений
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import asyncio
import httpx
import logging
from enum import Enum

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification, NotificationTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

class NotificationType(str, Enum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"
    READ = "read"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

# Schemas
class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    data: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    data: Optional[Dict[str, Any]]
    created_at: datetime
    sent_at: Optional[datetime]
    read_at: Optional[datetime]

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool

class NotificationTemplateCreate(BaseModel):
    name: str
    title_template: str
    message_template: str
    notification_type: NotificationType
    variables: List[str]

class BulkNotificationCreate(BaseModel):
    user_ids: List[int]
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    data: Optional[Dict[str, Any]] = None

# Services
class PushNotificationService:
    """Сервис для отправки Push уведомлений через Firebase"""
    
    def __init__(self):
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
        self.server_key = settings.FCM_SERVER_KEY
    
    async def send_push_notification(
        self, 
        device_tokens: List[str], 
        title: str, 
        message: str, 
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Отправка Push уведомления"""
        try:
            headers = {
                "Authorization": f"key={self.server_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "registration_ids": device_tokens,
                "notification": {
                    "title": title,
                    "body": message,
                    "sound": "default",
                    "badge": 1
                },
                "data": data or {},
                "priority": "high"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.fcm_url,
                    headers=headers,
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Push notification sent: {result}")
                    return True
                else:
                    logger.error(f"Push notification failed: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False

class SMSNotificationService:
    """Сервис для отправки SMS через Twilio"""
    
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_FROM_NUMBER
    
    async def send_sms(self, to_number: str, message: str) -> bool:
        """Отправка SMS"""
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            
            data = {
                "From": self.from_number,
                "To": to_number,
                "Body": message
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    data=data,
                    auth=(self.account_sid, self.auth_token),
                    timeout=10.0
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"SMS sent to {to_number}")
                    return True
                else:
                    logger.error(f"SMS failed: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False

class EmailNotificationService:
    """Сервис для отправки Email через SendGrid"""
    
    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.FROM_EMAIL
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Отправка Email"""
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "personalizations": [
                    {
                        "to": [{"email": to_email}],
                        "subject": subject
                    }
                ],
                "from": {"email": self.from_email},
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            if text_content:
                payload["content"].append({
                    "type": "text/plain",
                    "value": text_content
                })
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 202:
                    logger.info(f"Email sent to {to_email}")
                    return True
                else:
                    logger.error(f"Email failed: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

class NotificationService:
    """Основной сервис уведомлений"""
    
    def __init__(self):
        self.push_service = PushNotificationService()
        self.sms_service = SMSNotificationService()
        self.email_service = EmailNotificationService()
    
    async def send_notification(
        self, 
        notification: Notification,
        user: User
    ) -> bool:
        """Отправка уведомления пользователю"""
        try:
            success = False
            
            if notification.notification_type == NotificationType.PUSH:
                if user.device_tokens:
                    success = await self.push_service.send_push_notification(
                        device_tokens=user.device_tokens,
                        title=notification.title,
                        message=notification.message,
                        data=notification.data
                    )
            
            elif notification.notification_type == NotificationType.SMS:
                if user.phone and user.sms_enabled:
                    success = await self.sms_service.send_sms(
                        to_number=user.phone,
                        message=f"{notification.title}\n{notification.message}"
                    )
            
            elif notification.notification_type == NotificationType.EMAIL:
                if user.email and user.email_verified:
                    html_content = f"""
                    <html>
                    <body>
                        <h2>{notification.title}</h2>
                        <p>{notification.message}</p>
                        <p>С уважением,<br>Команда Bonus APP</p>
                    </body>
                    </html>
                    """
                    success = await self.email_service.send_email(
                        to_email=user.email,
                        subject=notification.title,
                        html_content=html_content
                    )
            
            # Обновляем статус уведомления
            if success:
                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.utcnow()
            else:
                notification.status = NotificationStatus.FAILED
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending notification {notification.id}: {e}")
            notification.status = NotificationStatus.FAILED
            return False

# Инициализация сервисов
notification_service = NotificationService()

# API Endpoints
@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    notification_data: NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Отправка уведомления пользователю"""
    
    # Проверяем существование пользователя
    user = db.query(User).filter(User.id == notification_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Создаем уведомление
    notification = Notification(
        user_id=notification_data.user_id,
        title=notification_data.title,
        message=notification_data.message,
        notification_type=notification_data.notification_type,
        priority=notification_data.priority,
        data=notification_data.data,
        scheduled_at=notification_data.scheduled_at,
        status=NotificationStatus.PENDING
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Отправляем уведомление в фоне
    background_tasks.add_task(
        notification_service.send_notification,
        notification,
        user
    )
    
    return NotificationResponse.from_orm(notification)

@router.post("/send-bulk", response_model=Dict[str, Any])
async def send_bulk_notification(
    bulk_data: BulkNotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Массовая отправка уведомлений"""
    
    notifications = []
    
    for user_id in bulk_data.user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            notification = Notification(
                user_id=user_id,
                title=bulk_data.title,
                message=bulk_data.message,
                notification_type=bulk_data.notification_type,
                priority=bulk_data.priority,
                data=bulk_data.data,
                status=NotificationStatus.PENDING
            )
            db.add(notification)
            notifications.append(notification)
    
    db.commit()
    
    # Отправляем все уведомления в фоне
    for notification in notifications:
        user = db.query(User).filter(User.id == notification.user_id).first()
        if user:
            background_tasks.add_task(
                notification_service.send_notification,
                notification,
                user
            )
    
    return {
        "message": f"Bulk notification scheduled for {len(notifications)} users",
        "notifications_count": len(notifications)
    }

@router.get("/user/{user_id}", response_model=NotificationListResponse)
async def get_user_notifications(
    user_id: int,
    page: int = 1,
    per_page: int = 20,
    notification_type: Optional[NotificationType] = None,
    status: Optional[NotificationStatus] = None,
    db: Session = Depends(get_db)
):
    """Получение уведомлений пользователя"""
    
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    
    if status:
        query = query.filter(Notification.status == status)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * per_page
    notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(per_page).all()
    
    return NotificationListResponse(
        notifications=[NotificationResponse.from_orm(n) for n in notifications],
        total=total,
        page=page,
        per_page=per_page,
        has_next=offset + per_page < total,
        has_prev=page > 1
    )

@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    """Отметить уведомление как прочитанное"""
    
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.patch("/user/{user_id}/mark-all-read")
async def mark_all_notifications_as_read(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Отметить все уведомления пользователя как прочитанные"""
    
    db.query(Notification).filter(
        and_(
            Notification.user_id == user_id,
            Notification.read_at.is_(None)
        )
    ).update({"read_at": datetime.utcnow()})
    
    db.commit()
    
    return {"message": "All notifications marked as read"}

@router.get("/user/{user_id}/unread-count")
async def get_unread_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Получение количества непрочитанных уведомлений"""
    
    count = db.query(Notification).filter(
        and_(
            Notification.user_id == user_id,
            Notification.read_at.is_(None)
        )
    ).count()
    
    return {"unread_count": count}

@router.post("/templates", response_model=Dict[str, Any])
async def create_notification_template(
    template_data: NotificationTemplateCreate,
    db: Session = Depends(get_db)
):
    """Создание шаблона уведомления"""
    
    template = NotificationTemplate(
        name=template_data.name,
        title_template=template_data.title_template,
        message_template=template_data.message_template,
        notification_type=template_data.notification_type,
        variables=template_data.variables
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return {"message": "Template created successfully", "template_id": template.id}

@router.post("/send-template/{template_id}")
async def send_notification_from_template(
    template_id: int,
    user_id: int,
    variables: Dict[str, str],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Отправка уведомления по шаблону"""
    
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Заменяем переменные в шаблоне
    title = template.title_template
    message = template.message_template
    
    for key, value in variables.items():
        title = title.replace(f"{{{key}}}", value)
        message = message.replace(f"{{{key}}}", value)
    
    # Создаем уведомление
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=template.notification_type,
        status=NotificationStatus.PENDING
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Отправляем уведомление в фоне
    background_tasks.add_task(
        notification_service.send_notification,
        notification,
        user
    )
    
    return {"message": "Notification sent from template", "notification_id": notification.id}

@router.get("/stats")
async def get_notification_stats(
    db: Session = Depends(get_db)
):
    """Статистика уведомлений"""
    
    total_notifications = db.query(Notification).count()
    sent_notifications = db.query(Notification).filter(Notification.status == NotificationStatus.SENT).count()
    failed_notifications = db.query(Notification).filter(Notification.status == NotificationStatus.FAILED).count()
    pending_notifications = db.query(Notification).filter(Notification.status == NotificationStatus.PENDING).count()
    
    # Статистика по типам
    push_count = db.query(Notification).filter(Notification.notification_type == NotificationType.PUSH).count()
    sms_count = db.query(Notification).filter(Notification.notification_type == NotificationType.SMS).count()
    email_count = db.query(Notification).filter(Notification.notification_type == NotificationType.EMAIL).count()
    
    return {
        "total_notifications": total_notifications,
        "sent_notifications": sent_notifications,
        "failed_notifications": failed_notifications,
        "pending_notifications": pending_notifications,
        "success_rate": (sent_notifications / total_notifications * 100) if total_notifications > 0 else 0,
        "by_type": {
            "push": push_count,
            "sms": sms_count,
            "email": email_count
        }
    }
