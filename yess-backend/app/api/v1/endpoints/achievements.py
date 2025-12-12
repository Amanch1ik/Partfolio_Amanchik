"""
Полная система достижений и уровней для Bonus APP
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
from enum import Enum

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import Achievement, AchievementType, UserAchievement, UserLevel, LevelReward
from app.models.transaction import Transaction
from app.models.order import Order
from app.models.referral import Referral
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/achievements", tags=["achievements"])

class AchievementCategory(str, Enum):
    TRANSACTION = "transaction"
    REFERRAL = "referral"
    LOYALTY = "loyalty"
    SOCIAL = "social"
    SPECIAL = "special"

class AchievementRarity(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

# Schemas
class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    category: AchievementCategory
    rarity: AchievementRarity
    points: int
    icon: str
    requirements: Dict[str, Any]
    is_active: bool
    created_at: datetime

class UserAchievementResponse(BaseModel):
    id: int
    achievement: AchievementResponse
    unlocked_at: datetime
    progress: Dict[str, Any]

class UserLevelResponse(BaseModel):
    current_level: int
    current_points: int
    points_to_next_level: int
    level_name: str
    level_color: str
    benefits: List[str]
    next_level_benefits: List[str]

class LevelRewardResponse(BaseModel):
    id: int
    level: int
    reward_type: str
    reward_value: float
    description: str

class AchievementProgressResponse(BaseModel):
    achievement_id: int
    achievement_name: str
    current_progress: int
    required_progress: int
    progress_percentage: float
    is_completed: bool

# Services
class AchievementService:
    """Сервис для работы с достижениями"""
    
    def __init__(self):
        self.achievement_checkers = {
            AchievementCategory.TRANSACTION: self._check_transaction_achievements,
            AchievementCategory.REFERRAL: self._check_referral_achievements,
            AchievementCategory.LOYALTY: self._check_loyalty_achievements,
            AchievementCategory.SOCIAL: self._check_social_achievements,
            AchievementCategory.SPECIAL: self._check_special_achievements,
        }
    
    async def check_user_achievements(
        self, 
        user_id: int, 
        category: Optional[AchievementCategory] = None,
        db: Session = None
    ) -> List[UserAchievement]:
        """Проверка достижений пользователя"""
        
        new_achievements = []
        
        if category:
            categories_to_check = [category]
        else:
            categories_to_check = list(self.achievement_checkers.keys())
        
        for cat in categories_to_check:
            checker = self.achievement_checkers.get(cat)
            if checker:
                achievements = await checker(user_id, db)
                new_achievements.extend(achievements)
        
        return new_achievements
    
    async def _check_transaction_achievements(self, user_id: int, db: Session) -> List[UserAchievement]:
        """Проверка достижений по транзакциям"""
        new_achievements = []
        
        # Получаем статистику транзакций пользователя
        total_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == user_id,
            Transaction.status == "completed"
        ).scalar()
        
        total_amount = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.status == "completed"
        ).scalar() or 0
        
        # Проверяем достижения по количеству транзакций
        transaction_achievements = db.query(Achievement).filter(
            Achievement.category == AchievementCategory.TRANSACTION,
            Achievement.is_active == True
        ).all()
        
        for achievement in transaction_achievements:
            # Проверяем, не получено ли уже это достижение
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement.id
            ).first()
            
            if not existing:
                requirements = achievement.requirements
                
                if requirements.get("type") == "transaction_count":
                    required_count = requirements.get("count", 0)
                    if total_transactions >= required_count:
                        user_achievement = UserAchievement(
                            user_id=user_id,
                            achievement_id=achievement.id,
                            unlocked_at=datetime.utcnow(),
                            progress={"completed": True}
                        )
                        db.add(user_achievement)
                        new_achievements.append(user_achievement)
                
                elif requirements.get("type") == "transaction_amount":
                    required_amount = requirements.get("amount", 0)
                    if total_amount >= required_amount:
                        user_achievement = UserAchievement(
                            user_id=user_id,
                            achievement_id=achievement.id,
                            unlocked_at=datetime.utcnow(),
                            progress={"completed": True}
                        )
                        db.add(user_achievement)
                        new_achievements.append(user_achievement)
        
        return new_achievements
    
    async def _check_referral_achievements(self, user_id: int, db: Session) -> List[UserAchievement]:
        """Проверка достижений по рефералам"""
        new_achievements = []
        
        # Получаем количество рефералов пользователя
        referral_count = db.query(func.count(Referral.id)).filter(
            Referral.referrer_id == user_id
        ).scalar()
        
        # Проверяем достижения по рефералам
        referral_achievements = db.query(Achievement).filter(
            Achievement.category == AchievementCategory.REFERRAL,
            Achievement.is_active == True
        ).all()
        
        for achievement in referral_achievements:
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement.id
            ).first()
            
            if not existing:
                requirements = achievement.requirements
                required_count = requirements.get("count", 0)
                
                if referral_count >= required_count:
                    user_achievement = UserAchievement(
                        user_id=user_id,
                        achievement_id=achievement.id,
                        unlocked_at=datetime.utcnow(),
                        progress={"completed": True}
                    )
                    db.add(user_achievement)
                    new_achievements.append(user_achievement)
        
        return new_achievements
    
    async def _check_loyalty_achievements(self, user_id: int, db: Session) -> List[UserAchievement]:
        """Проверка достижений по лояльности"""
        new_achievements = []
        
        # Получаем пользователя и его статистику
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return new_achievements
        
        # Проверяем достижения по лояльности
        loyalty_achievements = db.query(Achievement).filter(
            Achievement.category == AchievementCategory.LOYALTY,
            Achievement.is_active == True
        ).all()
        
        for achievement in loyalty_achievements:
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement.id
            ).first()
            
            if not existing:
                requirements = achievement.requirements
                
                if requirements.get("type") == "days_registered":
                    days_registered = (datetime.utcnow() - user.created_at).days
                    required_days = requirements.get("days", 0)
                    
                    if days_registered >= required_days:
                        user_achievement = UserAchievement(
                            user_id=user_id,
                            achievement_id=achievement.id,
                            unlocked_at=datetime.utcnow(),
                            progress={"completed": True}
                        )
                        db.add(user_achievement)
                        new_achievements.append(user_achievement)
        
        return new_achievements
    
    async def _check_social_achievements(self, user_id: int, db: Session) -> List[UserAchievement]:
        """Проверка социальных достижений"""
        # Здесь можно добавить проверку социальных достижений
        # Например, поделиться в соцсетях, оставить отзыв и т.д.
        return []
    
    async def _check_special_achievements(self, user_id: int, db: Session) -> List[UserAchievement]:
        """Проверка специальных достижений"""
        # Здесь можно добавить проверку специальных достижений
        # Например, достижения по времени, праздничные достижения и т.д.
        return []
    
    def calculate_user_level(self, total_points: int) -> Dict[str, Any]:
        """Расчет уровня пользователя на основе очков"""
        
        # Определяем уровень на основе очков
        if total_points < 100:
            level = 1
            level_name = "Новичок"
            level_color = "#8BC34A"
        elif total_points < 500:
            level = 2
            level_name = "Покупатель"
            level_color = "#2196F3"
        elif total_points < 1000:
            level = 3
            level_name = "Постоянный клиент"
            level_color = "#9C27B0"
        elif total_points < 2500:
            level = 4
            level_name = "VIP клиент"
            level_color = "#FF9800"
        elif total_points < 5000:
            level = 5
            level_name = "Золотой клиент"
            level_color = "#FFD700"
        else:
            level = 6
            level_name = "Платиновый клиент"
            level_color = "#E0E0E0"
        
        # Определяем очки до следующего уровня
        level_thresholds = [0, 100, 500, 1000, 2500, 5000, 10000]
        current_threshold = level_thresholds[level - 1] if level > 1 else 0
        next_threshold = level_thresholds[level] if level < len(level_thresholds) else level_thresholds[-1]
        
        points_to_next = next_threshold - total_points if level < 6 else 0
        
        # Определяем преимущества уровня
        benefits = self._get_level_benefits(level)
        next_level_benefits = self._get_level_benefits(level + 1) if level < 6 else []
        
        return {
            "current_level": level,
            "current_points": total_points,
            "points_to_next_level": points_to_next,
            "level_name": level_name,
            "level_color": level_color,
            "benefits": benefits,
            "next_level_benefits": next_level_benefits
        }
    
    def _get_level_benefits(self, level: int) -> List[str]:
        """Получение преимуществ уровня"""
        benefits_map = {
            1: ["Базовые скидки", "Доступ к акциям"],
            2: ["Увеличенные скидки", "Приоритетная поддержка"],
            3: ["Эксклюзивные предложения", "Персональный менеджер"],
            4: ["Максимальные скидки", "Ранний доступ к новинкам"],
            5: ["Золотые привилегии", "Индивидуальные предложения"],
            6: ["Платиновые привилегии", "Все преимущества"]
        }
        return benefits_map.get(level, [])

# Инициализация сервиса
achievement_service = AchievementService()

# API Endpoints
@router.get("/", response_model=List[AchievementResponse])
async def get_all_achievements(
    category: Optional[AchievementCategory] = None,
    rarity: Optional[AchievementRarity] = None,
    db: Session = Depends(get_db)
):
    """Получение всех достижений"""
    
    query = db.query(Achievement).filter(Achievement.is_active == True)
    
    if category:
        query = query.filter(Achievement.category == category)
    
    if rarity:
        query = query.filter(Achievement.rarity == rarity)
    
    achievements = query.order_by(Achievement.points.desc()).all()
    
    return [AchievementResponse.from_orm(achievement) for achievement in achievements]

@router.get("/user/{user_id}", response_model=List[UserAchievementResponse])
async def get_user_achievements(
    user_id: int,
    category: Optional[AchievementCategory] = None,
    db: Session = Depends(get_db)
):
    """Получение достижений пользователя"""
    
    query = db.query(UserAchievement).join(Achievement).filter(
        UserAchievement.user_id == user_id
    )
    
    if category:
        query = query.filter(Achievement.category == category)
    
    user_achievements = query.order_by(desc(UserAchievement.unlocked_at)).all()
    
    return [UserAchievementResponse.from_orm(ua) for ua in user_achievements]

@router.get("/user/{user_id}/level", response_model=UserLevelResponse)
async def get_user_level(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Получение уровня пользователя"""
    
    # Получаем общее количество очков пользователя
    total_points = db.query(func.sum(Achievement.points)).join(UserAchievement).filter(
        UserAchievement.user_id == user_id
    ).scalar() or 0
    
    level_info = achievement_service.calculate_user_level(total_points)
    
    return UserLevelResponse(**level_info)

@router.get("/user/{user_id}/progress", response_model=List[AchievementProgressResponse])
async def get_achievement_progress(
    user_id: int,
    category: Optional[AchievementCategory] = None,
    db: Session = Depends(get_db)
):
    """Получение прогресса по достижениям"""
    
    # Получаем все активные достижения
    query = db.query(Achievement).filter(Achievement.is_active == True)
    if category:
        query = query.filter(Achievement.category == category)
    
    achievements = query.all()
    progress_list = []
    
    for achievement in achievements:
        # Проверяем, получено ли достижение
        user_achievement = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement.id
        ).first()
        
        if user_achievement:
            # Достижение получено
            progress_list.append(AchievementProgressResponse(
                achievement_id=achievement.id,
                achievement_name=achievement.name,
                current_progress=achievement.requirements.get("count", 1),
                required_progress=achievement.requirements.get("count", 1),
                progress_percentage=100.0,
                is_completed=True
            ))
        else:
            # Рассчитываем прогресс
            requirements = achievement.requirements
            current_progress = 0
            required_progress = requirements.get("count", 1)
            
            if achievement.category == AchievementCategory.TRANSACTION:
                if requirements.get("type") == "transaction_count":
                    current_progress = db.query(func.count(Transaction.id)).filter(
                        Transaction.user_id == user_id,
                        Transaction.status == "completed"
                    ).scalar()
                elif requirements.get("type") == "transaction_amount":
                    current_progress = db.query(func.sum(Transaction.amount)).filter(
                        Transaction.user_id == user_id,
                        Transaction.status == "completed"
                    ).scalar() or 0
                    required_progress = requirements.get("amount", 1)
            
            elif achievement.category == AchievementCategory.REFERRAL:
                current_progress = db.query(func.count(Referral.id)).filter(
                    Referral.referrer_id == user_id
                ).scalar()
            
            progress_percentage = min(100.0, (current_progress / required_progress) * 100) if required_progress > 0 else 0
            
            progress_list.append(AchievementProgressResponse(
                achievement_id=achievement.id,
                achievement_name=achievement.name,
                current_progress=current_progress,
                required_progress=required_progress,
                progress_percentage=progress_percentage,
                is_completed=False
            ))
    
    return progress_list

@router.post("/check/{user_id}")
async def check_user_achievements(
    user_id: int,
    background_tasks: BackgroundTasks,
    category: Optional[AchievementCategory] = None,
    db: Session = Depends(get_db)
):
    """Проверка достижений пользователя"""
    
    # Проверяем достижения в фоне
    background_tasks.add_task(
        achievement_service.check_user_achievements,
        user_id,
        category,
        db
    )
    
    return {"message": "Achievement check scheduled"}

@router.get("/rewards/level/{level}", response_model=List[LevelRewardResponse])
async def get_level_rewards(
    level: int,
    db: Session = Depends(get_db)
):
    """Получение наград уровня"""
    
    rewards = db.query(LevelReward).filter(LevelReward.level == level).all()
    
    return [LevelRewardResponse.from_orm(reward) for reward in rewards]

@router.post("/claim-reward/{reward_id}")
async def claim_level_reward(
    reward_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение награды уровня"""
    
    reward = db.query(LevelReward).filter(LevelReward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    # Проверяем, достиг ли пользователь нужного уровня
    total_points = db.query(func.sum(Achievement.points)).join(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).scalar() or 0
    
    level_info = achievement_service.calculate_user_level(total_points)
    
    if level_info["current_level"] < reward.level:
        raise HTTPException(
            status_code=400, 
            detail=f"User level {level_info['current_level']} is not enough for reward level {reward.level}"
        )
    
    # Здесь можно добавить логику выдачи награды
    # Например, пополнение кошелька, скидки и т.д.
    
    return {"message": f"Reward {reward.description} claimed successfully"}

@router.get("/stats")
async def get_achievement_stats(
    db: Session = Depends(get_db)
):
    """Статистика достижений"""
    
    total_achievements = db.query(func.count(Achievement.id)).scalar()
    active_achievements = db.query(func.count(Achievement.id)).filter(Achievement.is_active == True).scalar()
    
    # Статистика по категориям
    category_stats = {}
    for category in AchievementCategory:
        count = db.query(func.count(Achievement.id)).filter(
            Achievement.category == category,
            Achievement.is_active == True
        ).scalar()
        category_stats[category.value] = count
    
    # Статистика по редкости
    rarity_stats = {}
    for rarity in AchievementRarity:
        count = db.query(func.count(Achievement.id)).filter(
            Achievement.rarity == rarity,
            Achievement.is_active == True
        ).scalar()
        rarity_stats[rarity.value] = count
    
    return {
        "total_achievements": total_achievements,
        "active_achievements": active_achievements,
        "by_category": category_stats,
        "by_rarity": rarity_stats
    }
