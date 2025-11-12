"""
Admin API роутеры для админ-панели
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])


# ========== Модели данных ==========

class AdminUser(BaseModel):
    id: str
    email: str
    role: str = "admin"
    name: Optional[str] = None

class DashboardStats(BaseModel):
    total_users: int = 10325
    active_users: int = 176000
    total_partners: int = 750
    active_partners: int = 650
    total_transactions: int = 2764
    total_revenue: float = 7400000.0
    revenue_growth: float = 12.5

class User(BaseModel):
    id: int
    phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    status: str = "active"
    balance: float = 0.0
    created_at: datetime = datetime.now()

class UserUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    status: Optional[str] = None
    balance: Optional[float] = None

class Partner(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"
    category: Optional[str] = None
    created_at: datetime = datetime.now()

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None

class Transaction(BaseModel):
    id: int
    user_id: int
    partner_id: Optional[int] = None
    amount: float
    type: str
    status: str = "completed"
    created_at: datetime = datetime.now()

class Promotion(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str = "active"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = datetime.now()

class Notification(BaseModel):
    id: int
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    created_at: datetime = datetime.now()

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    is_read: bool = False


# ========== Моковые данные ==========

MOCK_USERS = [
    User(id=i, phone=f"+996555{i:06d}", full_name=f"User {i}", status="active" if i % 3 != 0 else "inactive", balance=1000.0 * i)
    for i in range(1, 101)
]

MOCK_PARTNERS = [
    Partner(id=i, name=f"Partner {i}", email=f"partner{i}@example.com", phone=f"+996555{i:06d}", status="active" if i % 5 != 0 else "pending", category="restaurant" if i % 2 == 0 else "retail")
    for i in range(1, 51)
]

MOCK_TRANSACTIONS = [
    Transaction(id=i, user_id=(i % 50) + 1, partner_id=(i % 20) + 1, amount=100.0 * i, type="discount" if i % 2 == 0 else "cashback", status="completed")
    for i in range(1, 201)
]

MOCK_PROMOTIONS = [
    Promotion(id=i, title=f"Promotion {i}", description=f"Description for promotion {i}", status="active" if i % 3 != 0 else "inactive")
    for i in range(1, 31)
]

MOCK_NOTIFICATIONS = [
    Notification(id=i, title=f"Notification {i}", message=f"Message for notification {i}", type="info" if i % 3 == 0 else "success", is_read=i % 5 == 0)
    for i in range(1, 51)
]


# ========== Эндпоинты ==========

@router.get("/me")
async def get_current_admin():
    """Получить текущего администратора"""
    return {
        "id": "1",
        "email": "admin@yess.kg",
        "role": "admin",
        "name": "Admin User"
    }

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Получить статистику для дашборда"""
    return {
        "data": {
            "total_users": 10325,
            "active_users": 176000,
            "total_partners": 750,
            "active_partners": 650,
            "total_transactions": 2764,
            "total_revenue": 7400000.0,
            "revenue_growth": 12.5
        }
    }

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """Получить список пользователей"""
    users = MOCK_USERS.copy()
    
    if search:
        users = [u for u in users if search.lower() in (u.phone or "").lower() or (u.full_name or "").lower()]
    
    if status:
        users = [u for u in users if u.status == status]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "data": {
            "items": [u.dict() for u in users[start:end]],
            "page": page,
            "page_size": page_size,
            "total": len(users)
        }
    }

@router.get("/users/{user_id}")
async def get_user(user_id: int):
    """Получить пользователя по ID"""
    user = next((u for u in MOCK_USERS if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": user.dict()}

@router.put("/users/{user_id}")
async def update_user(user_id: int, user_data: UserUpdate):
    """Обновить пользователя"""
    user = next((u for u in MOCK_USERS if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Обновляем поля пользователя
    update_data = user_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    return {"data": user.dict()}

@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """Удалить пользователя"""
    global MOCK_USERS
    user = next((u for u in MOCK_USERS if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    MOCK_USERS = [u for u in MOCK_USERS if u.id != user_id]
    return {"message": "User deleted successfully"}

@router.get("/partners")
async def get_partners(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """Получить список партнеров"""
    partners = MOCK_PARTNERS.copy()
    
    if search:
        partners = [p for p in partners if search.lower() in (p.name or "").lower() or (p.email or "").lower()]
    
    if status:
        partners = [p for p in partners if p.status == status]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "data": {
            "items": [p.dict() for p in partners[start:end]],
            "page": page,
            "page_size": page_size,
            "total": len(partners)
        }
    }

@router.get("/partners/{partner_id}")
async def get_partner(partner_id: int):
    """Получить партнера по ID"""
    partner = next((p for p in MOCK_PARTNERS if p.id == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"data": partner.dict()}

@router.put("/partners/{partner_id}")
async def update_partner(partner_id: int, partner_data: PartnerUpdate):
    """Обновить партнера"""
    partner = next((p for p in MOCK_PARTNERS if p.id == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Обновляем поля партнера
    update_data = partner_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(partner, key, value)
    
    return {"data": partner.dict()}

@router.post("/partners/{partner_id}/approve")
async def approve_partner(partner_id: int):
    """Одобрить партнера"""
    partner = next((p for p in MOCK_PARTNERS if p.id == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    partner.status = "active"
    return {"data": partner.dict(), "message": "Partner approved successfully"}

@router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: int):
    """Удалить партнера"""
    global MOCK_PARTNERS
    partner = next((p for p in MOCK_PARTNERS if p.id == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    MOCK_PARTNERS = [p for p in MOCK_PARTNERS if p.id != partner_id]
    return {"message": "Partner deleted successfully"}

@router.get("/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None
):
    """Получить список транзакций"""
    transactions = MOCK_TRANSACTIONS.copy()
    
    if type:
        transactions = [t for t in transactions if t.type == type]
    
    if status:
        transactions = [t for t in transactions if t.status == status]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "data": {
            "items": [t.dict() for t in transactions[start:end]],
            "page": page,
            "page_size": page_size,
            "total": len(transactions)
        }
    }

@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: int):
    """Получить транзакцию по ID"""
    transaction = next((t for t in MOCK_TRANSACTIONS if t.id == transaction_id), None)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"data": transaction.dict()}

@router.get("/promotions")
async def get_promotions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None
):
    """Получить список акций"""
    promotions = MOCK_PROMOTIONS.copy()
    
    if status:
        promotions = [p for p in promotions if p.status == status]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "data": {
            "items": [p.dict() for p in promotions[start:end]],
            "page": page,
            "page_size": page_size,
            "total": len(promotions)
        }
    }

@router.post("/promotions")
async def create_promotion(promotion: Promotion):
    """Создать новую акцию"""
    new_id = max([p.id for p in MOCK_PROMOTIONS]) + 1
    promotion.id = new_id
    MOCK_PROMOTIONS.append(promotion)
    return {"data": promotion.dict()}

@router.get("/promotions/{promotion_id}")
async def get_promotion(promotion_id: int):
    """Получить акцию по ID"""
    promotion = next((p for p in MOCK_PROMOTIONS if p.id == promotion_id), None)
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return {"data": promotion.dict()}

@router.get("/notifications")
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None
):
    """Получить список уведомлений"""
    notifications = MOCK_NOTIFICATIONS.copy()
    
    if is_read is not None:
        notifications = [n for n in notifications if n.is_read == is_read]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "data": {
            "items": [n.dict() for n in notifications[start:end]],
            "page": page,
            "page_size": page_size,
            "total": len(notifications)
        }
    }

@router.post("/notifications")
async def create_notification(notification_data: NotificationCreate):
    """Создать новое уведомление"""
    new_id = max([n.id for n in MOCK_NOTIFICATIONS]) + 1 if MOCK_NOTIFICATIONS else 1
    notification = Notification(
        id=new_id,
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        is_read=notification_data.is_read
    )
    MOCK_NOTIFICATIONS.append(notification)
    return {"data": notification.dict()}

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

@router.post("/auth/login")
async def admin_login(data: LoginRequest):
    """Вход администратора"""
    username = data.username or data.email
    
    # В реальном приложении здесь должна быть проверка в БД
    if username and data.password:
        return {
            "access_token": "mock_admin_token_12345",
            "admin": {
                "id": "1",
                "email": username,
                "role": "admin",
                "name": "Admin User"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ========== Settings API ==========

@router.get("/settings")
async def get_settings():
    """Получить общие настройки"""
    return {
        "data": {
            "categories": [c.dict() for c in MOCK_CATEGORIES],
            "cities": [c.dict() for c in MOCK_CITIES],
            "limits": MOCK_LIMITS.dict(),
            "api_keys": [k.dict() for k in MOCK_API_KEYS]
        }
    }

class Category(BaseModel):
    id: int
    name: str
    created_at: datetime = datetime.now()

class City(BaseModel):
    id: int
    name: str
    country: str = "Кыргызстан"
    created_at: datetime = datetime.now()

class CityCreate(BaseModel):
    name: str
    country: str = "Кыргызстан"

class Limit(BaseModel):
    max_users_per_day: int = 1000
    max_transactions_per_day: int = 10000
    max_cashback_per_transaction: float = 1000.0

class ApiKey(BaseModel):
    id: int
    name: str
    key: str
    created_at: datetime = datetime.now()

MOCK_CATEGORIES = [
    Category(id=i, name=f"Категория {i}")
    for i in range(1, 11)
]

MOCK_CITIES = [
    City(id=1, name="Бишкек", country="Кыргызстан"),
    City(id=2, name="Ош", country="Кыргызстан"),
    City(id=3, name="Джалал-Абад", country="Кыргызстан"),
]

MOCK_LIMITS = Limit()

MOCK_API_KEYS = [
    ApiKey(id=1, name="Mobile App", key="sk_test_1234567890abcdef"),
    ApiKey(id=2, name="Web App", key="sk_test_abcdef1234567890"),
]

@router.get("/settings/categories")
async def get_categories():
    """Получить список категорий"""
    return {"data": [c.dict() for c in MOCK_CATEGORIES]}

@router.post("/settings/categories")
async def create_category(category: Category):
    """Создать категорию"""
    new_id = max([c.id for c in MOCK_CATEGORIES]) + 1
    category.id = new_id
    MOCK_CATEGORIES.append(category)
    return {"data": category.dict()}

@router.put("/settings/categories/{category_id}")
async def update_category(category_id: int, category: Category):
    """Обновить категорию"""
    cat = next((c for c in MOCK_CATEGORIES if c.id == category_id), None)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = category.name
    return {"data": cat.dict()}

@router.delete("/settings/categories/{category_id}")
async def delete_category(category_id: int):
    """Удалить категорию"""
    global MOCK_CATEGORIES
    MOCK_CATEGORIES = [c for c in MOCK_CATEGORIES if c.id != category_id]
    return {"message": "Category deleted"}

@router.get("/settings/cities")
async def get_cities():
    """Получить список городов"""
    return {"data": [c.dict() for c in MOCK_CITIES]}

@router.post("/settings/cities")
async def create_city(city_data: CityCreate):
    """Создать город"""
    new_id = max([c.id for c in MOCK_CITIES]) + 1 if MOCK_CITIES else 1
    city = City(
        id=new_id,
        name=city_data.name,
        country=city_data.country
    )
    MOCK_CITIES.append(city)
    return {"data": city.dict()}

@router.put("/settings/cities/{city_id}")
async def update_city(city_id: int, city: City):
    """Обновить город"""
    cit = next((c for c in MOCK_CITIES if c.id == city_id), None)
    if not cit:
        raise HTTPException(status_code=404, detail="City not found")
    cit.name = city.name
    cit.country = city.country
    return {"data": cit.dict()}

@router.delete("/settings/cities/{city_id}")
async def delete_city(city_id: int):
    """Удалить город"""
    global MOCK_CITIES
    MOCK_CITIES = [c for c in MOCK_CITIES if c.id != city_id]
    return {"message": "City deleted"}

@router.get("/settings/limits")
async def get_limits():
    """Получить лимиты"""
    return {"data": MOCK_LIMITS.dict()}

@router.put("/settings/limits")
async def update_limits(limits: Limit):
    """Обновить лимиты"""
    global MOCK_LIMITS
    MOCK_LIMITS = limits
    return {"data": limits.dict()}

@router.get("/settings/api-keys")
async def get_api_keys():
    """Получить список API ключей"""
    return {"data": [k.dict() for k in MOCK_API_KEYS]}

@router.post("/settings/api-keys")
async def create_api_key(api_key: ApiKey):
    """Создать API ключ"""
    new_id = max([k.id for k in MOCK_API_KEYS]) + 1
    api_key.id = new_id
    api_key.key = f"sk_test_{new_id}{''.join([str(i) for i in range(10)])}"
    MOCK_API_KEYS.append(api_key)
    return {"data": api_key.dict()}

@router.delete("/settings/api-keys/{key_id}")
async def delete_api_key(key_id: int):
    """Удалить API ключ"""
    global MOCK_API_KEYS
    MOCK_API_KEYS = [k for k in MOCK_API_KEYS if k.id != key_id]
    return {"message": "API key deleted"}


# ========== User Transfer API ==========

class TransferRequest(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float
    reason: Optional[str] = None

@router.post("/users/transfer")
async def transfer_coins(data: TransferRequest):
    """Перевод Yess коинов между пользователями"""
    if data.from_user_id == data.to_user_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same user")
    
    from_user = next((u for u in MOCK_USERS if u.id == data.from_user_id), None)
    to_user = next((u for u in MOCK_USERS if u.id == data.to_user_id), None)
    
    if not from_user:
        raise HTTPException(status_code=404, detail="From user not found")
    if not to_user:
        raise HTTPException(status_code=404, detail="To user not found")
    
    if from_user.balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Обновляем балансы
    from_user.balance -= data.amount
    to_user.balance += data.amount
    
    # Создаем транзакции
    transaction_id = max([t.id for t in MOCK_TRANSACTIONS]) + 1 if MOCK_TRANSACTIONS else 1
    MOCK_TRANSACTIONS.append(Transaction(
        id=transaction_id,
        user_id=from_user.id,
        amount=data.amount,
        type="transfer_out",
        status="completed"
    ))
    MOCK_TRANSACTIONS.append(Transaction(
        id=transaction_id + 1,
        user_id=to_user.id,
        amount=data.amount,
        type="transfer_in",
        status="completed"
    ))
    
    return {
        "message": "Transfer completed successfully",
        "data": {
            "from_user": {
                "id": from_user.id,
                "name": from_user.full_name,
                "new_balance": from_user.balance
            },
            "to_user": {
                "id": to_user.id,
                "name": to_user.full_name,
                "new_balance": to_user.balance
            },
            "amount": data.amount,
            "reason": data.reason
        }
    }

