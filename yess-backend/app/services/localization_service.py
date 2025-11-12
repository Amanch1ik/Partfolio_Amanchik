import json
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class Language(Enum):
    RUSSIAN = "ru"
    ENGLISH = "en"
    KYRGYZ = "ky"
    KAZAKH = "kk"
    UZBEK = "uz"

@dataclass
class Translation:
    key: str
    value: str
    language: Language
    context: Optional[str] = None

class LocalizationService:
    def __init__(self):
        self.current_language = Language.RUSSIAN
        self.translations: Dict[str, Dict[str, str]] = {}
        self.load_translations()
    
    def load_translations(self):
        """
        Загрузка переводов из файлов
        """
        try:
            # Базовые переводы
            self.translations = {
                Language.RUSSIAN.value: {
                    "welcome": "Добро пожаловать",
                    "login": "Войти",
                    "register": "Регистрация",
                    "profile": "Профиль",
                    "bonuses": "Бонусы",
                    "partners": "Партнеры",
                    "referral": "Реферальная программа",
                    "achievements": "Достижения",
                    "settings": "Настройки",
                    "logout": "Выйти",
                    "balance": "Баланс",
                    "points": "Очки",
                    "level": "Уровень",
                    "earn_points": "Заработать очки",
                    "spend_points": "Потратить очки",
                    "nearby_partners": "Партнеры рядом",
                    "search": "Поиск",
                    "categories": "Категории",
                    "restaurants": "Рестораны",
                    "cafes": "Кафе",
                    "beauty": "Красота",
                    "fitness": "Фитнес",
                    "shopping": "Покупки",
                    "entertainment": "Развлечения",
                    "health": "Здоровье",
                    "education": "Образование",
                    "referral_code": "Реферальный код",
                    "share": "Поделиться",
                    "copy": "Копировать",
                    "invite_friends": "Пригласить друзей",
                    "earn_bonus": "Заработать бонус",
                    "achievement_unlocked": "Достижение разблокировано!",
                    "points_earned": "Очки заработаны",
                    "congratulations": "Поздравляем!",
                    "continue": "Продолжить",
                    "cancel": "Отмена",
                    "confirm": "Подтвердить",
                    "save": "Сохранить",
                    "edit": "Редактировать",
                    "delete": "Удалить",
                    "back": "Назад",
                    "next": "Далее",
                    "previous": "Предыдущий",
                    "loading": "Загрузка...",
                    "error": "Ошибка",
                    "success": "Успешно",
                    "warning": "Предупреждение",
                    "info": "Информация",
                    "no_data": "Нет данных",
                    "try_again": "Попробовать снова",
                    "network_error": "Ошибка сети",
                    "server_error": "Ошибка сервера",
                    "unauthorized": "Не авторизован",
                    "forbidden": "Доступ запрещен",
                    "not_found": "Не найдено",
                    "validation_error": "Ошибка валидации",
                    "payment_success": "Платеж успешен",
                    "payment_failed": "Платеж не удался",
                    "payment_pending": "Платеж в обработке",
                    "insufficient_funds": "Недостаточно средств",
                    "invalid_amount": "Неверная сумма",
                    "payment_method": "Способ оплаты",
                    "card_number": "Номер карты",
                    "expiry_date": "Срок действия",
                    "cvv": "CVV",
                    "cardholder_name": "Имя держателя карты",
                    "phone_number": "Номер телефона",
                    "email": "Электронная почта",
                    "password": "Пароль",
                    "confirm_password": "Подтвердите пароль",
                    "forgot_password": "Забыли пароль?",
                    "remember_me": "Запомнить меня",
                    "terms_and_conditions": "Условия использования",
                    "privacy_policy": "Политика конфиденциальности",
                    "contact_support": "Связаться с поддержкой",
                    "about": "О приложении",
                    "version": "Версия",
                    "language": "Язык",
                    "theme": "Тема",
                    "notifications": "Уведомления",
                    "push_notifications": "Push-уведомления",
                    "email_notifications": "Email-уведомления",
                    "sms_notifications": "SMS-уведомления",
                    "dark_mode": "Темная тема",
                    "light_mode": "Светлая тема",
                    "auto_mode": "Автоматически",
                    "currency": "Валюта",
                    "timezone": "Часовой пояс",
                    "date_format": "Формат даты",
                    "time_format": "Формат времени"
                },
                Language.ENGLISH.value: {
                    "welcome": "Welcome",
                    "login": "Login",
                    "register": "Register",
                    "profile": "Profile",
                    "bonuses": "Bonuses",
                    "partners": "Partners",
                    "referral": "Referral Program",
                    "achievements": "Achievements",
                    "settings": "Settings",
                    "logout": "Logout",
                    "balance": "Balance",
                    "points": "Points",
                    "level": "Level",
                    "earn_points": "Earn Points",
                    "spend_points": "Spend Points",
                    "nearby_partners": "Nearby Partners",
                    "search": "Search",
                    "categories": "Categories",
                    "restaurants": "Restaurants",
                    "cafes": "Cafes",
                    "beauty": "Beauty",
                    "fitness": "Fitness",
                    "shopping": "Shopping",
                    "entertainment": "Entertainment",
                    "health": "Health",
                    "education": "Education",
                    "referral_code": "Referral Code",
                    "share": "Share",
                    "copy": "Copy",
                    "invite_friends": "Invite Friends",
                    "earn_bonus": "Earn Bonus",
                    "achievement_unlocked": "Achievement Unlocked!",
                    "points_earned": "Points Earned",
                    "congratulations": "Congratulations!",
                    "continue": "Continue",
                    "cancel": "Cancel",
                    "confirm": "Confirm",
                    "save": "Save",
                    "edit": "Edit",
                    "delete": "Delete",
                    "back": "Back",
                    "next": "Next",
                    "previous": "Previous",
                    "loading": "Loading...",
                    "error": "Error",
                    "success": "Success",
                    "warning": "Warning",
                    "info": "Information",
                    "no_data": "No Data",
                    "try_again": "Try Again",
                    "network_error": "Network Error",
                    "server_error": "Server Error",
                    "unauthorized": "Unauthorized",
                    "forbidden": "Forbidden",
                    "not_found": "Not Found",
                    "validation_error": "Validation Error",
                    "payment_success": "Payment Successful",
                    "payment_failed": "Payment Failed",
                    "payment_pending": "Payment Pending",
                    "insufficient_funds": "Insufficient Funds",
                    "invalid_amount": "Invalid Amount",
                    "payment_method": "Payment Method",
                    "card_number": "Card Number",
                    "expiry_date": "Expiry Date",
                    "cvv": "CVV",
                    "cardholder_name": "Cardholder Name",
                    "phone_number": "Phone Number",
                    "email": "Email",
                    "password": "Password",
                    "confirm_password": "Confirm Password",
                    "forgot_password": "Forgot Password?",
                    "remember_me": "Remember Me",
                    "terms_and_conditions": "Terms and Conditions",
                    "privacy_policy": "Privacy Policy",
                    "contact_support": "Contact Support",
                    "about": "About",
                    "version": "Version",
                    "language": "Language",
                    "theme": "Theme",
                    "notifications": "Notifications",
                    "push_notifications": "Push Notifications",
                    "email_notifications": "Email Notifications",
                    "sms_notifications": "SMS Notifications",
                    "dark_mode": "Dark Mode",
                    "light_mode": "Light Mode",
                    "auto_mode": "Auto Mode",
                    "currency": "Currency",
                    "timezone": "Timezone",
                    "date_format": "Date Format",
                    "time_format": "Time Format"
                },
                Language.KYRGYZ.value: {
                    "welcome": "Кош келдиңиз",
                    "login": "Кирүү",
                    "register": "Катталуу",
                    "profile": "Профиль",
                    "bonuses": "Бонус",
                    "partners": "Партнерлер",
                    "referral": "Рефералдык программа",
                    "achievements": "Жетишкендиктер",
                    "settings": "Орнотуулар",
                    "logout": "Чыгуу",
                    "balance": "Баланс",
                    "points": "Упай",
                    "level": "Денгээл",
                    "earn_points": "Упай табуу",
                    "spend_points": "Упай сарптоо",
                    "nearby_partners": "Жакынкы партнерлер",
                    "search": "Издөө",
                    "categories": "Категориялар",
                    "restaurants": "Ресторандар",
                    "cafes": "Кафе",
                    "beauty": "Сулуулук",
                    "fitness": "Ден соолук",
                    "shopping": "Сатып алуу",
                    "entertainment": "Көңүл ачуу",
                    "health": "Ден соолук",
                    "education": "Билим берүү",
                    "referral_code": "Рефералдык код",
                    "share": "Бөлүшүү",
                    "copy": "Көчүрүү",
                    "invite_friends": "Достарды чакыруу",
                    "earn_bonus": "Бонус табуу",
                    "achievement_unlocked": "Жетишкендик ачылды!",
                    "points_earned": "Упай табылды",
                    "congratulations": "Куттуктайбыз!",
                    "continue": "Улантуу",
                    "cancel": "Жокко чыгаруу",
                    "confirm": "Ырастоо",
                    "save": "Сактоо",
                    "edit": "Түзөтүү",
                    "delete": "Өчүрүү",
                    "back": "Артка",
                    "next": "Кийинки",
                    "previous": "Мурунку",
                    "loading": "Жүктөлүүдө...",
                    "error": "Ката",
                    "success": "Ийгилик",
                    "warning": "Эскертүү",
                    "info": "Маалымат",
                    "no_data": "Маалымат жок",
                    "try_again": "Кайра аракет кылуу",
                    "network_error": "Тармак катасы",
                    "server_error": "Сервер катасы",
                    "unauthorized": "Уруксат жок",
                    "forbidden": "Тыйылган",
                    "not_found": "Табылган жок",
                    "validation_error": "Текшерүү катасы",
                    "payment_success": "Төлөм ийгиликтүү",
                    "payment_failed": "Төлөм ийгиликсиз",
                    "payment_pending": "Төлөм күтүүдө",
                    "insufficient_funds": "Акча жетишсиз",
                    "invalid_amount": "Туура эмес сумма",
                    "payment_method": "Төлөм ыкмасы",
                    "card_number": "Карта номуру",
                    "expiry_date": "Мөөнөтү",
                    "cvv": "CVV",
                    "cardholder_name": "Карта ээсинин аты",
                    "phone_number": "Телефон номуру",
                    "email": "Электрондук почта",
                    "password": "Сыр сөз",
                    "confirm_password": "Сыр сөздү ырастоо",
                    "forgot_password": "Сыр сөздү унутуп калдыңызбы?",
                    "remember_me": "Мени эстеп калуу",
                    "terms_and_conditions": "Колдонуу шарттары",
                    "privacy_policy": "Купуялык саясаты",
                    "contact_support": "Колдоо менен байланышуу",
                    "about": "Колдонмо жөнүндө",
                    "version": "Версия",
                    "language": "Тил",
                    "theme": "Тема",
                    "notifications": "Эскертүүлөр",
                    "push_notifications": "Push-эскертүүлөр",
                    "email_notifications": "Email-эскертүүлөр",
                    "sms_notifications": "SMS-эскертүүлөр",
                    "dark_mode": "Караңгы тема",
                    "light_mode": "Жарык тема",
                    "auto_mode": "Автоматтык",
                    "currency": "Валюта",
                    "timezone": "Убакыт зонасы",
                    "date_format": "Күн форматы",
                    "time_format": "Убакыт форматы"
                }
            }
            
        except Exception as e:
            logger.error(f"Error loading translations: {e}")
    
    def set_language(self, language: Language):
        """
        Установка текущего языка
        """
        self.current_language = language
        logger.info(f"Language changed to: {language.value}")
    
    def get_translation(self, key: str, language: Optional[Language] = None) -> str:
        """
        Получение перевода по ключу
        """
        try:
            lang = language or self.current_language
            translations = self.translations.get(lang.value, {})
            return translations.get(key, key)  # Возвращаем ключ, если перевод не найден
            
        except Exception as e:
            logger.error(f"Error getting translation: {e}")
            return key
    
    def get_all_translations(self, language: Optional[Language] = None) -> Dict[str, str]:
        """
        Получение всех переводов для языка
        """
        try:
            lang = language or self.current_language
            return self.translations.get(lang.value, {})
            
        except Exception as e:
            logger.error(f"Error getting all translations: {e}")
            return {}
    
    def add_translation(self, key: str, value: str, language: Language):
        """
        Добавление нового перевода
        """
        try:
            if language.value not in self.translations:
                self.translations[language.value] = {}
            
            self.translations[language.value][key] = value
            
        except Exception as e:
            logger.error(f"Error adding translation: {e}")
    
    def get_supported_languages(self) -> List[Dict[str, str]]:
        """
        Получение списка поддерживаемых языков
        """
        return [
            {
                "code": Language.RUSSIAN.value,
                "name": "Русский",
                "native_name": "Русский",
                "flag": "🇷🇺"
            },
            {
                "code": Language.ENGLISH.value,
                "name": "English",
                "native_name": "English",
                "flag": "🇺🇸"
            },
            {
                "code": Language.KYRGYZ.value,
                "name": "Кыргызский",
                "native_name": "Кыргызча",
                "flag": "🇰🇬"
            },
            {
                "code": Language.KAZAKH.value,
                "name": "Казахский",
                "native_name": "Қазақша",
                "flag": "🇰🇿"
            },
            {
                "code": Language.UZBEK.value,
                "name": "Узбекский",
                "native_name": "O'zbekcha",
                "flag": "🇺🇿"
            }
        ]
    
    def format_number(self, number: float, language: Optional[Language] = None) -> str:
        """
        Форматирование чисел в соответствии с языком
        """
        try:
            lang = language or self.current_language
            
            if lang == Language.RUSSIAN or lang == Language.KYRGYZ:
                # Русский/Кыргызский формат: 1 234,56
                return f"{number:,.2f}".replace(",", " ").replace(".", ",")
            else:
                # Английский формат: 1,234.56
                return f"{number:,.2f}"
                
        except Exception as e:
            logger.error(f"Error formatting number: {e}")
            return str(number)
    
    def format_currency(self, amount: float, currency: str = "KGS", language: Optional[Language] = None) -> str:
        """
        Форматирование валюты
        """
        try:
            lang = language or self.current_language
            formatted_amount = self.format_number(amount, language)
            
            if currency == "KGS":
                if lang == Language.RUSSIAN:
                    return f"{formatted_amount} сом"
                elif lang == Language.KYRGYZ:
                    return f"{formatted_amount} сом"
                else:
                    return f"{formatted_amount} KGS"
            elif currency == "USD":
                return f"${formatted_amount}"
            elif currency == "EUR":
                return f"€{formatted_amount}"
            else:
                return f"{formatted_amount} {currency}"
                
        except Exception as e:
            logger.error(f"Error formatting currency: {e}")
            return f"{amount} {currency}"
    
    def format_date(self, timestamp: float, language: Optional[Language] = None) -> str:
        """
        Форматирование даты
        """
        try:
            from datetime import datetime
            lang = language or self.current_language
            
            dt = datetime.fromtimestamp(timestamp)
            
            if lang == Language.RUSSIAN or lang == Language.KYRGYZ:
                # Русский/Кыргызский формат: ДД.ММ.ГГГГ
                return dt.strftime("%d.%m.%Y")
            else:
                # Английский формат: ММ/ДД/ГГГГ
                return dt.strftime("%m/%d/%Y")
                
        except Exception as e:
            logger.error(f"Error formatting date: {e}")
            return str(timestamp)

# Глобальный экземпляр сервиса локализации
localization_service = LocalizationService()
