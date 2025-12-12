"""
Seed данные для Кыргызстана
Города, банки, партнеры, достижения и другие начальные данные
"""

import asyncio
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.city import City
from app.models.partner import Partner, PartnerLocation
from app.models.achievement import Achievement, LevelReward
from app.models.promotion import Promotion as PromotionModel, PromoCode
from app.models.user import User
from app.models.wallet import Wallet
from app.models.role import Role
from app.models.notification import NotificationTemplate
import logging

logger = logging.getLogger(__name__)

async def seed_kyrgyzstan_data():
    """Заполнение базы данных данными для Кыргызстана"""
    
    db = next(get_db())
    
    try:
        # 1. Создаем города КР
        await seed_cities(db)
        
        # 2. Создаем роли
        await seed_roles(db)
        
        # 3. Создаем партнеров
        await seed_partners(db)
        
        # 4. Создаем достижения
        await seed_achievements(db)
        
        # 5. Создаем награды уровней
        await seed_level_rewards(db)
        
        # 6. Создаем акции
        await seed_promotions(db)
        
        # 7. Создаем шаблоны уведомлений
        await seed_notification_templates(db)
        
        # 8. Создаем тестового пользователя
        await seed_test_user(db)
        
        db.commit()
        logger.info("Kyrgyzstan seed data created successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating seed data: {e}")
        raise
    finally:
        db.close()

async def seed_cities(db: Session):
    """Создание городов Кыргызстана"""
    
    cities_data = [
        {
            "name": "Бишкек",
            "name_kg": "Бишкек",
            "name_ru": "Бишкек",
            "name_en": "Bishkek",
            "region": "Чуйская область",
            "population": 1027200,
            "is_capital": True,
            "latitude": 42.8746,
            "longitude": 74.5698
        },
        {
            "name": "Ош",
            "name_kg": "Ош",
            "name_ru": "Ош",
            "name_en": "Osh",
            "region": "Ошская область",
            "population": 322000,
            "is_capital": False,
            "latitude": 40.5283,
            "longitude": 72.7985
        },
        {
            "name": "Джалал-Абад",
            "name_kg": "Жалал-Абад",
            "name_ru": "Джалал-Абад",
            "name_en": "Jalal-Abad",
            "region": "Джалал-Абадская область",
            "population": 108000,
            "is_capital": False,
            "latitude": 40.9375,
            "longitude": 72.9785
        },
        {
            "name": "Каракол",
            "name_kg": "Каракол",
            "name_ru": "Каракол",
            "name_en": "Karakol",
            "region": "Иссык-Кульская область",
            "population": 75000,
            "is_capital": False,
            "latitude": 42.4907,
            "longitude": 78.3936
        },
        {
            "name": "Токмок",
            "name_kg": "Токмок",
            "name_ru": "Токмок",
            "name_en": "Tokmok",
            "region": "Чуйская область",
            "population": 53000,
            "is_capital": False,
            "latitude": 42.8417,
            "longitude": 75.3014
        },
        {
            "name": "Кызыл-Кыя",
            "name_kg": "Кызыл-Кыя",
            "name_ru": "Кызыл-Кыя",
            "name_en": "Kyzyl-Kiya",
            "region": "Баткенская область",
            "population": 45000,
            "is_capital": False,
            "latitude": 40.2667,
            "longitude": 72.1167
        },
        {
            "name": "Узген",
            "name_kg": "Өзгөн",
            "name_ru": "Узген",
            "name_en": "Uzgen",
            "region": "Ошская область",
            "population": 55000,
            "is_capital": False,
            "latitude": 40.7667,
            "longitude": 73.3000
        },
        {
            "name": "Балыкчы",
            "name_kg": "Балыкчы",
            "name_ru": "Балыкчы",
            "name_en": "Balykchy",
            "region": "Иссык-Кульская область",
            "population": 42000,
            "is_capital": False,
            "latitude": 42.4603,
            "longitude": 76.1872
        },
        {
            "name": "Кара-Балта",
            "name_kg": "Кара-Балта",
            "name_ru": "Кара-Балта",
            "name_en": "Kara-Balta",
            "region": "Чуйская область",
            "population": 47000,
            "is_capital": False,
            "latitude": 42.8167,
            "longitude": 73.8500
        },
        {
            "name": "Нарын",
            "name_kg": "Нарын",
            "name_ru": "Нарын",
            "name_en": "Naryn",
            "region": "Нарынская область",
            "population": 40000,
            "is_capital": False,
            "latitude": 41.4333,
            "longitude": 75.9833
        }
    ]
    
    for city_data in cities_data:
        existing_city = db.query(City).filter(City.name == city_data["name"]).first()
        if not existing_city:
            city = City(**city_data)
            db.add(city)
    
    logger.info(f"Created {len(cities_data)} cities")

async def seed_roles(db: Session):
    """Создание ролей"""
    
    roles_data = [
        {"name": "admin", "description": "Администратор системы"},
        {"name": "user", "description": "Обычный пользователь"},
        {"name": "partner", "description": "Партнер"},
        {"name": "moderator", "description": "Модератор"},
        {"name": "support", "description": "Служба поддержки"}
    ]
    
    for role_data in roles_data:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
    
    logger.info(f"Created {len(roles_data)} roles")

async def seed_partners(db: Session):
    """Создание партнеров"""
    
    partners_data = [
        {
            "name": "Глобус",
            "name_kg": "Глобус",
            "name_ru": "Глобус",
            "description": "Сеть супермаркетов",
            "description_kg": "Супермаркет тармагы",
            "description_ru": "Сеть супермаркетов",
            "category": "Продукты",
            "category_kg": "Азык-түлүк",
            "category_ru": "Продукты",
            "logo_url": "/static/partners/globus.png",
            "website": "https://globus.kg",
            "phone": "+996 312 123456",
            "email": "info@globus.kg",
            "is_active": True,
            "max_discount_percent": 10.0,
            "cashback_percent": 2.0,
            "bonus_multiplier": 1.5
        },
        {
            "name": "Фрунзе",
            "name_kg": "Фрунзе",
            "name_ru": "Фрунзе",
            "description": "Торговый центр",
            "description_kg": "Соода борбору",
            "description_ru": "Торговый центр",
            "category": "Торговый центр",
            "category_kg": "Соода борбору",
            "category_ru": "Торговый центр",
            "logo_url": "/static/partners/frunze.png",
            "website": "https://frunze.kg",
            "phone": "+996 312 234567",
            "email": "info@frunze.kg",
            "is_active": True,
            "max_discount_percent": 15.0,
            "cashback_percent": 3.0,
            "bonus_multiplier": 2.0
        },
        {
            "name": "Дордой",
            "name_kg": "Дордой",
            "name_ru": "Дордой",
            "description": "Рынок",
            "description_kg": "Базар",
            "description_ru": "Рынок",
            "category": "Рынок",
            "category_kg": "Базар",
            "category_ru": "Рынок",
            "logo_url": "/static/partners/dordoi.png",
            "website": "https://dordoi.kg",
            "phone": "+996 312 345678",
            "email": "info@dordoi.kg",
            "is_active": True,
            "max_discount_percent": 5.0,
            "cashback_percent": 1.0,
            "bonus_multiplier": 1.0
        },
        {
            "name": "Бишкек Парк",
            "name_kg": "Бишкек Парк",
            "name_ru": "Бишкек Парк",
            "description": "Торговый центр",
            "description_kg": "Соода борбору",
            "description_ru": "Торговый центр",
            "category": "Торговый центр",
            "category_kg": "Соода борбору",
            "category_ru": "Торговый центр",
            "logo_url": "/static/partners/bishkek_park.png",
            "website": "https://bishkekpark.kg",
            "phone": "+996 312 456789",
            "email": "info@bishkekpark.kg",
            "is_active": True,
            "max_discount_percent": 20.0,
            "cashback_percent": 5.0,
            "bonus_multiplier": 3.0
        },
        {
            "name": "Айчурек",
            "name_kg": "Айчурек",
            "name_ru": "Айчурек",
            "description": "Кафе",
            "description_kg": "Кафе",
            "description_ru": "Кафе",
            "category": "Кафе",
            "category_kg": "Кафе",
            "category_ru": "Кафе",
            "logo_url": "/static/partners/aichurek.png",
            "website": "https://aichurek.kg",
            "phone": "+996 312 567890",
            "email": "info@aichurek.kg",
            "is_active": True,
            "max_discount_percent": 8.0,
            "cashback_percent": 2.0,
            "bonus_multiplier": 1.5
        }
    ]
    
    for partner_data in partners_data:
        existing_partner = db.query(Partner).filter(Partner.name == partner_data["name"]).first()
        if not existing_partner:
            partner = Partner(**partner_data)
            db.add(partner)
            db.flush()  # Получаем ID партнера
            
            # Создаем локации для партнера
            await seed_partner_locations(db, partner.id, partner_data["name"])
    
    logger.info(f"Created {len(partners_data)} partners")

async def seed_partner_locations(db: Session, partner_id: int, partner_name: str):
    """Создание локаций партнеров"""
    
    # Получаем города
    cities = db.query(City).all()
    
    # Создаем локации в разных городах
    for city in cities[:3]:  # Первые 3 города
        location_data = {
            "partner_id": partner_id,
            "city_id": city.id,
            "address": f"{partner_name} - {city.name}",
            "address_kg": f"{partner_name} - {city.name_kg}",
            "address_ru": f"{partner_name} - {city.name_ru}",
            "latitude": city.latitude + 0.01,  # Небольшое смещение
            "longitude": city.longitude + 0.01,
            "phone": f"+996 {city.id}123456",
            "working_hours": "09:00-21:00",
            "is_active": True
        }
        
        location = PartnerLocation(**location_data)
        db.add(location)

async def seed_achievements(db: Session):
    """Создание достижений"""
    
    achievements_data = [
        {
            "name": "Первая покупка",
            "name_kg": "Биринчи сатып алуу",
            "name_ru": "Первая покупка",
            "description": "Совершите первую покупку",
            "description_kg": "Биринчи сатып алууну жасаңыз",
            "description_ru": "Совершите первую покупку",
            "category": "transaction",
            "rarity": "common",
            "points": 10,
            "icon": "🛒",
            "requirements": {"type": "transaction_count", "count": 1},
            "is_active": True
        },
        {
            "name": "Постоянный клиент",
            "name_kg": "Туруктуу кардар",
            "name_ru": "Постоянный клиент",
            "description": "Совершите 10 покупок",
            "description_kg": "10 сатып алуу жасаңыз",
            "description_ru": "Совершите 10 покупок",
            "category": "transaction",
            "rarity": "rare",
            "points": 50,
            "icon": "⭐",
            "requirements": {"type": "transaction_count", "count": 10},
            "is_active": True
        },
        {
            "name": "VIP клиент",
            "name_kg": "VIP кардар",
            "name_ru": "VIP клиент",
            "description": "Совершите 50 покупок",
            "description_kg": "50 сатып алуу жасаңыз",
            "description_ru": "Совершите 50 покупок",
            "category": "transaction",
            "rarity": "epic",
            "points": 200,
            "icon": "👑",
            "requirements": {"type": "transaction_count", "count": 50},
            "is_active": True
        },
        {
            "name": "Большой покупатель",
            "name_kg": "Чоң сатып алуучу",
            "name_ru": "Большой покупатель",
            "description": "Потратьте 10,000 сом",
            "description_kg": "10,000 сом жумшаңыз",
            "description_ru": "Потратьте 10,000 сом",
            "category": "transaction",
            "rarity": "rare",
            "points": 100,
            "icon": "💰",
            "requirements": {"type": "transaction_amount", "amount": 10000},
            "is_active": True
        },
        {
            "name": "Реферал",
            "name_kg": "Реферал",
            "name_ru": "Реферал",
            "description": "Приведите друга",
            "description_kg": "Досуңузду алыңыз",
            "description_ru": "Приведите друга",
            "category": "referral",
            "rarity": "common",
            "points": 25,
            "icon": "👥",
            "requirements": {"type": "referral_count", "count": 1},
            "is_active": True
        },
        {
            "name": "Активный реферал",
            "name_kg": "Активдүү реферал",
            "name_ru": "Активный реферал",
            "description": "Приведите 5 друзей",
            "description_kg": "5 досуңузду алыңыз",
            "description_ru": "Приведите 5 друзей",
            "category": "referral",
            "rarity": "epic",
            "points": 150,
            "icon": "🎯",
            "requirements": {"type": "referral_count", "count": 5},
            "is_active": True
        },
        {
            "name": "Лояльный клиент",
            "name_kg": "Ынтымак кардар",
            "name_ru": "Лояльный клиент",
            "description": "Используйте приложение 30 дней",
            "description_kg": "Колдонмону 30 күн колдонуңуз",
            "description_ru": "Используйте приложение 30 дней",
            "category": "loyalty",
            "rarity": "rare",
            "points": 75,
            "icon": "📱",
            "requirements": {"type": "days_registered", "days": 30},
            "is_active": True
        }
    ]
    
    for achievement_data in achievements_data:
        existing_achievement = db.query(Achievement).filter(
            Achievement.name == achievement_data["name"]
        ).first()
        if not existing_achievement:
            achievement = Achievement(**achievement_data)
            db.add(achievement)
    
    logger.info(f"Created {len(achievements_data)} achievements")

async def seed_level_rewards(db: Session):
    """Создание наград уровней"""
    
    level_rewards_data = [
        {
            "level": 1,
            "reward_type": "bonus_points",
            "reward_value": 50,
            "description": "50 бонусных очков",
            "is_active": True
        },
        {
            "level": 2,
            "reward_type": "bonus_points",
            "reward_value": 100,
            "description": "100 бонусных очков",
            "is_active": True
        },
        {
            "level": 3,
            "reward_type": "discount",
            "reward_value": 5,
            "description": "5% скидка на все покупки",
            "is_active": True
        },
        {
            "level": 4,
            "reward_type": "discount",
            "reward_value": 10,
            "description": "10% скидка на все покупки",
            "is_active": True
        },
        {
            "level": 5,
            "reward_type": "cashback",
            "reward_value": 2,
            "description": "2% кэшбэк на все покупки",
            "is_active": True
        },
        {
            "level": 6,
            "reward_type": "cashback",
            "reward_value": 5,
            "description": "5% кэшбэк на все покупки",
            "is_active": True
        }
    ]
    
    for reward_data in level_rewards_data:
        existing_reward = db.query(LevelReward).filter(
            LevelReward.level == reward_data["level"]
        ).first()
        if not existing_reward:
            reward = LevelReward(**reward_data)
            db.add(reward)
    
    logger.info(f"Created {len(level_rewards_data)} level rewards")

async def seed_promotions(db: Session):
    """Создание акций"""
    
    promotions_data = [
        {
            "title": "Добро пожаловать!",
            "title_kg": "Кош келдиңиз!",
            "title_ru": "Добро пожаловать!",
            "description": "Скидка 10% на первую покупку",
            "description_kg": "Биринчи сатып алууга 10% арзандатуу",
            "description_ru": "Скидка 10% на первую покупку",
            "category": "general",
            "promotion_type": "discount_percent",
            "discount_percent": 10.0,
            "min_order_amount": 100.0,
            "max_discount_amount": 500.0,
            "usage_limit": 1000,
            "usage_limit_per_user": 1,
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=365),
            "status": "active",
            "is_active": True
        },
        {
            "title": "Реферальная программа",
            "title_kg": "Рефералдык программа",
            "title_ru": "Реферальная программа",
            "description": "Бонус 100 сом за каждого друга",
            "description_kg": "Ар бир досуңуз үчүн 100 сом бонус",
            "description_ru": "Бонус 100 сом за каждого друга",
            "category": "referral",
            "promotion_type": "bonus_points",
            "discount_amount": 100.0,
            "usage_limit": None,
            "usage_limit_per_user": None,
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=365),
            "status": "active",
            "is_active": True
        }
    ]
    
    for promotion_data in promotions_data:
        existing_promotion = db.query(PromotionModel).filter(
            PromotionModel.title == promotion_data["title"]
        ).first()
        if not existing_promotion:
            promotion = PromotionModel(**promotion_data)
            db.add(promotion)
    
    logger.info(f"Created {len(promotions_data)} promotions")

async def seed_notification_templates(db: Session):
    """Создание шаблонов уведомлений"""
    
    templates_data = [
        {
            "name": "welcome",
            "title_template": "Кош келдиңиз!",
            "message_template": "Сиз Bonus APP'ке ийгиликтүү катталдыңыз!",
            "notification_type": "push",
            "variables": ["user_name"]
        },
        {
            "name": "payment_success",
            "title_template": "Төлөм ийгиликтүү",
            "message_template": "Сиздин төлөмүңүз ийгиликтүү аткарылды. Сумма: {amount} сом",
            "notification_type": "push",
            "variables": ["amount"]
        },
        {
            "name": "achievement_unlocked",
            "title_template": "Жетишкендик ачылды!",
            "message_template": "Сиз '{achievement_name}' жетишкендигин алып жатасыз!",
            "notification_type": "push",
            "variables": ["achievement_name"]
        },
        {
            "name": "promotion_available",
            "title_template": "Жаңы акция!",
            "message_template": "Сиз үчүн жаңы акция: {promotion_title}",
            "notification_type": "push",
            "variables": ["promotion_title"]
        }
    ]
    
    for template_data in templates_data:
        existing_template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == template_data["name"]
        ).first()
        if not existing_template:
            template = NotificationTemplate(**template_data)
            db.add(template)
    
    logger.info(f"Created {len(templates_data)} notification templates")

async def seed_test_user(db: Session):
    """Создание тестового пользователя"""
    
    test_user_data = {
        "name": "Тест Пользователь",
        "name_kg": "Тест Колдонуучу",
        "name_ru": "Тест Пользователь",
        "email": "test@bonusapp.kg",
        "phone": "+996507123456",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8K8K8K8K",  # password: test123
        "phone_verified": True,
        "email_verified": True,
        "is_active": True,
        "referral_code": "TEST123"
    }
    
    existing_user = db.query(User).filter(User.email == test_user_data["email"]).first()
    if not existing_user:
        user = User(**test_user_data)
        db.add(user)
        db.flush()  # Получаем ID пользователя
        
        # Создаем кошелек
        wallet = Wallet(
            user_id=user.id,
            balance=1000.0,  # Начальный баланс 1000 сом
            currency="KGS"
        )
        db.add(wallet)
        
        logger.info("Created test user with wallet")
    else:
        logger.info("Test user already exists")

if __name__ == "__main__":
    asyncio.run(seed_kyrgyzstan_data())
