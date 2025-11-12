import asyncio
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class AchievementType(Enum):
    REGISTRATION = "registration"
    FIRST_PURCHASE = "first_purchase"
    REFERRAL = "referral"
    LOYALTY = "loyalty"
    SOCIAL = "social"
    SPECIAL = "special"

class AchievementStatus(Enum):
    LOCKED = "locked"
    UNLOCKED = "unlocked"
    COMPLETED = "completed"

@dataclass
class Achievement:
    id: int
    name: str
    description: str
    type: AchievementType
    icon: str
    points: int
    status: AchievementStatus
    progress: float = 0.0
    unlocked_at: Optional[float] = None
    completed_at: Optional[float] = None

class AchievementService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.achievement_definitions = {
            AchievementType.REGISTRATION: {
                "name": "Добро пожаловать!",
                "description": "Зарегистрируйтесь в системе YESS",
                "icon": "👋",
                "points": 10,
                "condition": {"action": "register"}
            },
            AchievementType.FIRST_PURCHASE: {
                "name": "Первый шаг",
                "description": "Совершите первую покупку",
                "icon": "🛒",
                "points": 25,
                "condition": {"action": "purchase", "count": 1}
            },
            AchievementType.REFERRAL: {
                "name": "Друг познается в беде",
                "description": "Пригласите 5 друзей",
                "icon": "👥",
                "points": 50,
                "condition": {"action": "referral", "count": 5}
            },
            AchievementType.LOYALTY: {
                "name": "Постоянный клиент",
                "description": "Совершите 100 покупок",
                "icon": "💎",
                "points": 100,
                "condition": {"action": "purchase", "count": 100}
            },
            AchievementType.SOCIAL: {
                "name": "Социальная активность",
                "description": "Поделитесь в социальных сетях 10 раз",
                "icon": "📱",
                "points": 30,
                "condition": {"action": "social_share", "count": 10}
            },
            AchievementType.SPECIAL: {
                "name": "Особый случай",
                "description": "Получите специальное достижение",
                "icon": "⭐",
                "points": 200,
                "condition": {"action": "special"}
            }
        }
    
    async def check_achievements(self, user_id: int, action: str, metadata: Dict[str, Any] = None) -> List[Achievement]:
        """
        Проверка достижений пользователя
        """
        try:
            unlocked_achievements = []
            
            # Получение текущих достижений пользователя
            current_achievements = await self.get_user_achievements(user_id)
            
            # Проверка каждого типа достижения
            for achievement_type, definition in self.achievement_definitions.items():
                if definition["condition"]["action"] == action:
                    achievement = await self.check_specific_achievement(
                        user_id, achievement_type, definition, metadata
                    )
                    
                    if achievement and achievement.status == AchievementStatus.COMPLETED:
                        unlocked_achievements.append(achievement)
            
            return unlocked_achievements
            
        except Exception as e:
            logger.error(f"Error checking achievements: {e}")
            return []
    
    async def check_specific_achievement(
        self, 
        user_id: int, 
        achievement_type: AchievementType, 
        definition: Dict[str, Any], 
        metadata: Dict[str, Any] = None
    ) -> Optional[Achievement]:
        """
        Проверка конкретного достижения
        """
        try:
            condition = definition["condition"]
            required_count = condition.get("count", 1)
            
            # Получение текущего прогресса
            current_progress = await self.get_achievement_progress(user_id, achievement_type)
            
            # Проверка выполнения условия
            if current_progress >= required_count:
                # Достижение выполнено
                achievement = Achievement(
                    id=achievement_type.value,
                    name=definition["name"],
                    description=definition["description"],
                    type=achievement_type,
                    icon=definition["icon"],
                    points=definition["points"],
                    status=AchievementStatus.COMPLETED,
                    progress=100.0,
                    completed_at=time.time()
                )
                
                # Сохранение достижения
                await self.save_achievement(user_id, achievement)
                
                # Начисление очков
                await self.award_points(user_id, definition["points"])
                
                return achievement
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking specific achievement: {e}")
            return None
    
    async def get_achievement_progress(self, user_id: int, achievement_type: AchievementType) -> int:
        """
        Получение прогресса достижения
        """
        try:
            condition = self.achievement_definitions[achievement_type]["condition"]
            action = condition["action"]
            
            if action == "register":
                # Проверка регистрации
                query = text("SELECT COUNT(*) FROM users WHERE id = :user_id")
                result = self.db.execute(query, {"user_id": user_id}).fetchone()
                return 1 if result[0] > 0 else 0
            
            elif action == "purchase":
                # Подсчет покупок
                query = text("SELECT COUNT(*) FROM orders WHERE user_id = :user_id")
                result = self.db.execute(query, {"user_id": user_id}).fetchone()
                return result[0]
            
            elif action == "referral":
                # Подсчет рефералов
                query = text("SELECT COUNT(*) FROM referrals WHERE referrer_id = :user_id AND status = 'completed'")
                result = self.db.execute(query, {"user_id": user_id}).fetchone()
                return result[0]
            
            elif action == "social_share":
                # Подсчет социальных активностей
                query = text("SELECT COUNT(*) FROM social_activities WHERE user_id = :user_id AND action = 'share'")
                result = self.db.execute(query, {"user_id": user_id}).fetchone()
                return result[0]
            
            elif action == "special":
                # Проверка специальных условий
                query = text("SELECT COUNT(*) FROM special_achievements WHERE user_id = :user_id")
                result = self.db.execute(query, {"user_id": user_id}).fetchone()
                return result[0]
            
            return 0
            
        except Exception as e:
            logger.error(f"Error getting achievement progress: {e}")
            return 0
    
    async def get_user_achievements(self, user_id: int) -> List[Achievement]:
        """
        Получение всех достижений пользователя
        """
        try:
            achievements = []
            
            for achievement_type, definition in self.achievement_definitions.items():
                progress = await self.get_achievement_progress(user_id, achievement_type)
                required_count = definition["condition"].get("count", 1)
                
                # Определение статуса
                if progress >= required_count:
                    status = AchievementStatus.COMPLETED
                elif progress > 0:
                    status = AchievementStatus.UNLOCKED
                else:
                    status = AchievementStatus.LOCKED
                
                achievement = Achievement(
                    id=achievement_type.value,
                    name=definition["name"],
                    description=definition["description"],
                    type=achievement_type,
                    icon=definition["icon"],
                    points=definition["points"],
                    status=status,
                    progress=(progress / required_count) * 100 if required_count > 0 else 0
                )
                
                achievements.append(achievement)
            
            return achievements
            
        except Exception as e:
            logger.error(f"Error getting user achievements: {e}")
            return []
    
    async def save_achievement(self, user_id: int, achievement: Achievement):
        """
        Сохранение достижения в базе данных
        """
        try:
            query = text("""
                INSERT INTO user_achievements (user_id, achievement_type, status, points_earned, completed_at)
                VALUES (:user_id, :achievement_type, :status, :points, :completed_at)
                ON CONFLICT (user_id, achievement_type) DO UPDATE SET
                    status = :status,
                    points_earned = :points,
                    completed_at = :completed_at
            """)
            
            self.db.execute(query, {
                "user_id": user_id,
                "achievement_type": achievement.type.value,
                "status": achievement.status.value,
                "points": achievement.points,
                "completed_at": achievement.completed_at
            })
            
        except Exception as e:
            logger.error(f"Error saving achievement: {e}")
    
    async def award_points(self, user_id: int, points: int):
        """
        Начисление очков пользователю
        """
        try:
            # Обновление баланса очков
            query = text("""
                UPDATE user_stats 
                SET achievement_points = achievement_points + :points,
                    total_points = total_points + :points,
                    updated_at = :updated_at
                WHERE user_id = :user_id
            """)
            
            self.db.execute(query, {
                "user_id": user_id,
                "points": points,
                "updated_at": time.time()
            })
            
            # Создание записи о начислении очков
            points_query = text("""
                INSERT INTO points_transactions (user_id, points, type, description, created_at)
                VALUES (:user_id, :points, :type, :description, :created_at)
            """)
            
            self.db.execute(points_query, {
                "user_id": user_id,
                "points": points,
                "type": "achievement",
                "description": "Achievement reward",
                "created_at": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error awarding points: {e}")
    
    async def get_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Получение таблицы лидеров
        """
        try:
            query = text("""
                SELECT 
                    u.id,
                    u.username,
                    us.achievement_points,
                    us.total_points,
                    COUNT(ua.id) as achievements_count,
                    RANK() OVER (ORDER BY us.achievement_points DESC) as rank
                FROM users u
                LEFT JOIN user_stats us ON u.id = us.user_id
                LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.status = 'completed'
                WHERE u.is_active = true
                GROUP BY u.id, u.username, us.achievement_points, us.total_points
                ORDER BY us.achievement_points DESC
                LIMIT :limit
            """)
            
            results = self.db.execute(query, {"limit": limit}).fetchall()
            
            leaderboard = []
            for row in results:
                leaderboard.append({
                    "user_id": row[0],
                    "username": row[1],
                    "achievement_points": row[2] or 0,
                    "total_points": row[3] or 0,
                    "achievements_count": row[4] or 0,
                    "rank": row[5]
                })
            
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {e}")
            return []
    
    async def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Получение статистики пользователя
        """
        try:
            # Общая статистика
            stats_query = text("""
                SELECT 
                    achievement_points,
                    total_points,
                    level,
                    created_at
                FROM user_stats 
                WHERE user_id = :user_id
            """)
            
            stats_result = self.db.execute(stats_query, {"user_id": user_id}).fetchone()
            
            # Количество достижений
            achievements_query = text("""
                SELECT 
                    COUNT(*) as total_achievements,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_achievements
                FROM user_achievements 
                WHERE user_id = :user_id
            """)
            
            achievements_result = self.db.execute(achievements_query, {"user_id": user_id}).fetchone()
            
            return {
                "achievement_points": stats_result[0] if stats_result else 0,
                "total_points": stats_result[1] if stats_result else 0,
                "level": stats_result[2] if stats_result else 1,
                "total_achievements": achievements_result[0] if achievements_result else 0,
                "completed_achievements": achievements_result[1] if achievements_result else 0,
                "member_since": stats_result[3] if stats_result else None
            }
            
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {}

# Глобальный экземпляр сервиса достижений
achievement_service = AchievementService(None)  # Будет инициализирован с реальной сессией БД
