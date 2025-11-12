"""
Валидация для Кыргызстана
Телефоны, валюты, даты и другие специфичные для КР валидации
"""

from pydantic import BaseModel, validator, Field
from typing import Optional, List
from datetime import datetime, date
import re
import phonenumbers
from decimal import Decimal

class KyrgyzPhoneValidator:
    """Валидатор кыргызских номеров телефонов"""
    
    @staticmethod
    def validate_phone(phone: str) -> str:
        """Валидация и форматирование кыргызского номера телефона"""
        
        # Убираем все символы кроме цифр и +
        clean_phone = re.sub(r'[^\d+]', '', phone)
        
        # Проверяем различные форматы
        if clean_phone.startswith('+996'):
            # Формат +996XXXXXXXXX
            if len(clean_phone) == 13:
                return clean_phone
        elif clean_phone.startswith('996'):
            # Формат 996XXXXXXXXX
            if len(clean_phone) == 12:
                return f"+{clean_phone}"
        elif clean_phone.startswith('0'):
            # Формат 0XXXXXXXXX
            if len(clean_phone) == 10:
                return f"+996{clean_phone[1:]}"
        
        raise ValueError("Неверный формат номера телефона КР")
    
    @staticmethod
    def is_valid_phone(phone: str) -> bool:
        """Проверка валидности номера телефона"""
        try:
            KyrgyzPhoneValidator.validate_phone(phone)
            return True
        except ValueError:
            return False

class KyrgyzCurrencyValidator:
    """Валидатор кыргызской валюты"""
    
    @staticmethod
    def validate_amount(amount: float) -> float:
        """Валидация суммы в сомах"""
        
        if amount < 0:
            raise ValueError("Сумма не может быть отрицательной")
        
        if amount < 1:
            raise ValueError("Минимальная сумма: 1 сом")
        
        if amount > 1000000:
            raise ValueError("Максимальная сумма: 1,000,000 сом")
        
        # Округляем до 2 знаков после запятой
        return round(amount, 2)
    
    @staticmethod
    def format_currency(amount: float) -> str:
        """Форматирование валюты для КР"""
        
        # Форматируем с разделителями тысяч
        formatted = f"{amount:,.2f}"
        
        # Заменяем запятую на пробел для разделения тысяч
        formatted = formatted.replace(',', ' ')
        
        return f"{formatted} сом"

class KyrgyzDateValidator:
    """Валидатор дат для Кыргызстана"""
    
    @staticmethod
    def validate_date(date_str: str) -> date:
        """Валидация даты в формате ДД.ММ.ГГГГ"""
        
        try:
            # Парсим дату в формате ДД.ММ.ГГГГ
            day, month, year = date_str.split('.')
            return date(int(year), int(month), int(day))
        except ValueError:
            raise ValueError("Неверный формат даты. Используйте ДД.ММ.ГГГГ")
    
    @staticmethod
    def format_date(date_obj: date) -> str:
        """Форматирование даты для КР"""
        return date_obj.strftime("%d.%m.%Y")
    
    @staticmethod
    def format_datetime(datetime_obj: datetime) -> str:
        """Форматирование даты и времени для КР"""
        return datetime_obj.strftime("%d.%m.%Y %H:%M")

# Pydantic модели с валидацией для КР
class KyrgyzPhoneField(BaseModel):
    """Поле для кыргызского номера телефона"""
    
    phone: str = Field(..., description="Номер телефона в формате +996XXXXXXXXX")
    
    @validator('phone')
    def validate_phone(cls, v):
        return KyrgyzPhoneValidator.validate_phone(v)

class KyrgyzAmountField(BaseModel):
    """Поле для суммы в сомах"""
    
    amount: float = Field(..., description="Сумма в сомах")
    
    @validator('amount')
    def validate_amount(cls, v):
        return KyrgyzCurrencyValidator.validate_amount(v)

class KyrgyzDateField(BaseModel):
    """Поле для даты в формате КР"""
    
    date: str = Field(..., description="Дата в формате ДД.ММ.ГГГГ")
    
    @validator('date')
    def validate_date(cls, v):
        KyrgyzDateValidator.validate_date(v)
        return v

class UserRegistrationKG(BaseModel):
    """Регистрация пользователя с валидацией для КР"""
    
    name: str = Field(..., min_length=2, max_length=100, description="Имя пользователя")
    phone: str = Field(..., description="Номер телефона КР")
    email: Optional[str] = Field(None, description="Email адрес")
    password: str = Field(..., min_length=6, max_length=100, description="Пароль")
    city_id: Optional[int] = Field(None, description="ID города")
    referral_code: Optional[str] = Field(None, description="Реферальный код")
    
    @validator('phone')
    def validate_phone(cls, v):
        return KyrgyzPhoneValidator.validate_phone(v)
    
    @validator('email')
    def validate_email(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Неверный формат email')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Пароль должен содержать буквы')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать цифры')
        return v

class PaymentRequestKG(BaseModel):
    """Запрос на платеж с валидацией для КР"""
    
    amount: float = Field(..., description="Сумма платежа в сомах")
    bank_type: str = Field(..., description="Тип банка")
    description: Optional[str] = Field(None, max_length=500, description="Описание платежа")
    
    @validator('amount')
    def validate_amount(cls, v):
        return KyrgyzCurrencyValidator.validate_amount(v)
    
    @validator('bank_type')
    def validate_bank_type(cls, v):
        valid_banks = ['optimal', 'demir', 'rsk', 'bakai', 'elcart']
        if v not in valid_banks:
            raise ValueError(f'Неподдерживаемый банк. Доступные: {", ".join(valid_banks)}')
        return v

class PartnerCreateKG(BaseModel):
    """Создание партнера с валидацией для КР"""
    
    name: str = Field(..., min_length=2, max_length=200, description="Название партнера")
    name_kg: str = Field(..., min_length=2, max_length=200, description="Название на кыргызском")
    name_ru: str = Field(..., min_length=2, max_length=200, description="Название на русском")
    description: str = Field(..., max_length=1000, description="Описание")
    description_kg: str = Field(..., max_length=1000, description="Описание на кыргызском")
    description_ru: str = Field(..., max_length=1000, description="Описание на русском")
    category: str = Field(..., description="Категория")
    phone: str = Field(..., description="Телефон")
    email: Optional[str] = Field(None, description="Email")
    website: Optional[str] = Field(None, description="Веб-сайт")
    max_discount_percent: float = Field(0.0, ge=0.0, le=100.0, description="Максимальная скидка %")
    cashback_percent: float = Field(0.0, ge=0.0, le=100.0, description="Кэшбэк %")
    
    @validator('phone')
    def validate_phone(cls, v):
        return KyrgyzPhoneValidator.validate_phone(v)
    
    @validator('email')
    def validate_email(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Неверный формат email')
        return v
    
    @validator('website')
    def validate_website(cls, v):
        if v and not re.match(r'^https?://', v):
            raise ValueError('Веб-сайт должен начинаться с http:// или https://')
        return v

class ReviewCreateKG(BaseModel):
    """Создание отзыва с валидацией для КР"""
    
    partner_id: int = Field(..., description="ID партнера")
    rating: int = Field(..., ge=1, le=5, description="Рейтинг от 1 до 5")
    comment: Optional[str] = Field(None, max_length=1000, description="Комментарий")
    
    @validator('comment')
    def validate_comment(cls, v):
        if v and len(v.strip()) < 10:
            raise ValueError('Комментарий должен содержать минимум 10 символов')
        return v

class PromotionCreateKG(BaseModel):
    """Создание акции с валидацией для КР"""
    
    title: str = Field(..., min_length=5, max_length=200, description="Название акции")
    title_kg: str = Field(..., min_length=5, max_length=200, description="Название на кыргызском")
    title_ru: str = Field(..., min_length=5, max_length=200, description="Название на русском")
    description: str = Field(..., max_length=1000, description="Описание")
    description_kg: str = Field(..., max_length=1000, description="Описание на кыргызском")
    description_ru: str = Field(..., max_length=1000, description="Описание на русском")
    category: str = Field(..., description="Категория акции")
    discount_percent: Optional[float] = Field(None, ge=0.0, le=100.0, description="Скидка в %")
    discount_amount: Optional[float] = Field(None, ge=0.0, description="Фиксированная скидка")
    min_order_amount: Optional[float] = Field(None, ge=0.0, description="Минимальная сумма заказа")
    max_discount_amount: Optional[float] = Field(None, ge=0.0, description="Максимальная скидка")
    start_date: datetime = Field(..., description="Дата начала")
    end_date: datetime = Field(..., description="Дата окончания")
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('Дата окончания должна быть позже даты начала')
        return v
    
    @validator('discount_percent')
    def validate_discount_percent(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Скидка должна быть от 0 до 100%')
        return v

class NotificationCreateKG(BaseModel):
    """Создание уведомления с валидацией для КР"""
    
    user_id: int = Field(..., description="ID пользователя")
    title: str = Field(..., min_length=5, max_length=200, description="Заголовок")
    title_kg: str = Field(..., min_length=5, max_length=200, description="Заголовок на кыргызском")
    title_ru: str = Field(..., min_length=5, max_length=200, description="Заголовок на русском")
    message: str = Field(..., min_length=10, max_length=1000, description="Сообщение")
    message_kg: str = Field(..., min_length=10, max_length=1000, description="Сообщение на кыргызском")
    message_ru: str = Field(..., min_length=10, max_length=1000, description="Сообщение на русском")
    notification_type: str = Field(..., description="Тип уведомления")
    priority: str = Field("normal", description="Приоритет")
    
    @validator('notification_type')
    def validate_notification_type(cls, v):
        valid_types = ['push', 'sms', 'email', 'in_app']
        if v not in valid_types:
            raise ValueError(f'Неподдерживаемый тип уведомления. Доступные: {", ".join(valid_types)}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if v not in valid_priorities:
            raise ValueError(f'Неподдерживаемый приоритет. Доступные: {", ".join(valid_priorities)}')
        return v

class AchievementCreateKG(BaseModel):
    """Создание достижения с валидацией для КР"""
    
    name: str = Field(..., min_length=5, max_length=100, description="Название достижения")
    name_kg: str = Field(..., min_length=5, max_length=100, description="Название на кыргызском")
    name_ru: str = Field(..., min_length=5, max_length=100, description="Название на русском")
    description: str = Field(..., max_length=500, description="Описание")
    description_kg: str = Field(..., max_length=500, description="Описание на кыргызском")
    description_ru: str = Field(..., max_length=500, description="Описание на русском")
    category: str = Field(..., description="Категория")
    rarity: str = Field("common", description="Редкость")
    points: int = Field(0, ge=0, description="Очки за достижение")
    icon: str = Field("🏆", description="Иконка")
    
    @validator('category')
    def validate_category(cls, v):
        valid_categories = ['transaction', 'referral', 'loyalty', 'social', 'special']
        if v not in valid_categories:
            raise ValueError(f'Неподдерживаемая категория. Доступные: {", ".join(valid_categories)}')
        return v
    
    @validator('rarity')
    def validate_rarity(cls, v):
        valid_rarities = ['common', 'rare', 'epic', 'legendary']
        if v not in valid_rarities:
            raise ValueError(f'Неподдерживаемая редкость. Доступные: {", ".join(valid_rarities)}')
        return v

# Утилиты для валидации
class ValidationUtils:
    """Утилиты для валидации"""
    
    @staticmethod
    def validate_kyrgyz_phone(phone: str) -> bool:
        """Проверка кыргызского номера телефона"""
        return KyrgyzPhoneValidator.is_valid_phone(phone)
    
    @staticmethod
    def format_kyrgyz_phone(phone: str) -> str:
        """Форматирование кыргызского номера телефона"""
        return KyrgyzPhoneValidator.validate_phone(phone)
    
    @staticmethod
    def validate_kyrgyz_amount(amount: float) -> bool:
        """Проверка суммы в сомах"""
        try:
            KyrgyzCurrencyValidator.validate_amount(amount)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def format_kyrgyz_currency(amount: float) -> str:
        """Форматирование валюты для КР"""
        return KyrgyzCurrencyValidator.format_currency(amount)
    
    @staticmethod
    def validate_kyrgyz_date(date_str: str) -> bool:
        """Проверка даты в формате КР"""
        try:
            KyrgyzDateValidator.validate_date(date_str)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def format_kyrgyz_date(date_obj: date) -> str:
        """Форматирование даты для КР"""
        return KyrgyzDateValidator.format_date(date_obj)
    
    @staticmethod
    def format_kyrgyz_datetime(datetime_obj: datetime) -> str:
        """Форматирование даты и времени для КР"""
        return KyrgyzDateValidator.format_datetime(datetime_obj)
