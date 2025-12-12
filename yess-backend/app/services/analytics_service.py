import asyncio
import time
import json
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
import statistics
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class EventType(Enum):
    PAGE_VIEW = "page_view"
    BUTTON_CLICK = "button_click"
    FORM_SUBMIT = "form_submit"
    PURCHASE = "purchase"
    REFERRAL = "referral"
    ACHIEVEMENT = "achievement"
    PAYMENT = "payment"
    SEARCH = "search"
    FILTER = "filter"
    SHARE = "share"

class UserSegment(Enum):
    NEW_USER = "new_user"
    ACTIVE_USER = "active_user"
    VIP_USER = "vip_user"
    CHURNED_USER = "churned_user"
    POTENTIAL_CHURN = "potential_churn"

@dataclass
class AnalyticsEvent:
    id: str
    user_id: int
    event_type: EventType
    event_name: str
    properties: Dict[str, Any]
    timestamp: float
    session_id: str
    platform: str = "mobile"

@dataclass
class UserBehaviorProfile:
    user_id: int
    segment: UserSegment
    engagement_score: float
    retention_probability: float
    lifetime_value: float
    preferred_categories: List[str]
    activity_patterns: Dict[str, Any]
    last_activity: float

class AnalyticsService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.event_buffer = []
        self.buffer_size = 100
        self.flush_interval = 60  # секунды
        
    async def track_event(self, event: AnalyticsEvent):
        """
        Отслеживание события пользователя
        """
        try:
            # Добавление события в буфер
            self.event_buffer.append(event)
            
            # Если буфер заполнен, сброс в базу данных
            if len(self.event_buffer) >= self.buffer_size:
                await self.flush_events()
            
        except Exception as e:
            logger.error(f"Error tracking event: {e}")
    
    async def flush_events(self):
        """
        Сброс событий из буфера в базу данных
        """
        try:
            if not self.event_buffer:
                return
            
            # Подготовка данных для массовой вставки
            events_data = []
            for event in self.event_buffer:
                events_data.append({
                    "id": event.id,
                    "user_id": event.user_id,
                    "event_type": event.event_type.value,
                    "event_name": event.event_name,
                    "properties": json.dumps(event.properties),
                    "timestamp": event.timestamp,
                    "session_id": event.session_id,
                    "platform": event.platform
                })
            
            # Массовая вставка событий
            query = text("""
                INSERT INTO analytics_events (
                    id, user_id, event_type, event_name, properties,
                    timestamp, session_id, platform
                ) VALUES (
                    :id, :user_id, :event_type, :event_name, :properties,
                    :timestamp, :session_id, :platform
                )
            """)
            
            for event_data in events_data:
                self.db.execute(query, event_data)
            
            # Очистка буфера
            self.event_buffer.clear()
            
            logger.info(f"Flushed {len(events_data)} events to database")
            
        except Exception as e:
            logger.error(f"Error flushing events: {e}")
    
    async def get_user_behavior_profile(self, user_id: int) -> Optional[UserBehaviorProfile]:
        """
        Получение профиля поведения пользователя
        """
        try:
            # Получение базовой информации о пользователе
            user_query = """
                SELECT 
                    u.id, u.created_at, u.is_active,
                    w.balance, us.achievement_points, us.level,
                    COUNT(DISTINCT o.id) as total_orders,
                    SUM(o.amount) as total_spent,
                    MAX(o.created_at) as last_order_date
                FROM users u
                LEFT JOIN wallets w ON u.id = w.user_id
                LEFT JOIN user_stats us ON u.id = us.user_id
                LEFT JOIN orders o ON u.id = o.user_id
                WHERE u.id = :user_id
                GROUP BY u.id, u.created_at, u.is_active, w.balance, us.achievement_points, us.level
            """
            
            user_result = self.db.execute(text(user_query), {"user_id": user_id}).fetchone()
            
            if not user_result:
                return None
            
            # Получение событий пользователя
            events_query = """
                SELECT 
                    event_type, event_name, properties, timestamp
                FROM analytics_events
                WHERE user_id = :user_id
                ORDER BY timestamp DESC
                LIMIT 1000
            """
            
            events_results = self.db.execute(text(events_query), {"user_id": user_id}).fetchall()
            
            # Анализ поведения
            behavior_analysis = self.analyze_user_behavior(events_results, user_result)
            
            return UserBehaviorProfile(
                user_id=user_id,
                segment=behavior_analysis["segment"],
                engagement_score=behavior_analysis["engagement_score"],
                retention_probability=behavior_analysis["retention_probability"],
                lifetime_value=behavior_analysis["lifetime_value"],
                preferred_categories=behavior_analysis["preferred_categories"],
                activity_patterns=behavior_analysis["activity_patterns"],
                last_activity=behavior_analysis["last_activity"]
            )
            
        except Exception as e:
            logger.error(f"Error getting user behavior profile: {e}")
            return None
    
    def analyze_user_behavior(self, events: List[Tuple], user_data: Tuple) -> Dict[str, Any]:
        """
        Анализ поведения пользователя на основе событий
        """
        try:
            user_id, created_at, is_active, balance, achievement_points, level, total_orders, total_spent, last_order_date = user_data
            
            # Расчет времени с последней активности
            current_time = time.time()
            days_since_creation = (current_time - created_at) / (24 * 3600)
            days_since_last_order = (current_time - (last_order_date or created_at)) / (24 * 3600) if last_order_date else days_since_creation
            
            # Определение сегмента пользователя
            segment = self.determine_user_segment(
                days_since_creation, days_since_last_order, total_orders, 
                float(total_spent or 0), is_active
            )
            
            # Расчет скора вовлеченности
            engagement_score = self.calculate_engagement_score(events, total_orders, achievement_points)
            
            # Расчет вероятности удержания
            retention_probability = self.calculate_retention_probability(
                segment, engagement_score, days_since_last_order
            )
            
            # Расчет пожизненной ценности
            lifetime_value = self.calculate_lifetime_value(
                float(total_spent or 0), total_orders, engagement_score
            )
            
            # Анализ предпочтений по категориям
            preferred_categories = self.analyze_category_preferences(events)
            
            # Анализ паттернов активности
            activity_patterns = self.analyze_activity_patterns(events)
            
            return {
                "segment": segment,
                "engagement_score": engagement_score,
                "retention_probability": retention_probability,
                "lifetime_value": lifetime_value,
                "preferred_categories": preferred_categories,
                "activity_patterns": activity_patterns,
                "last_activity": current_time - days_since_last_order * 24 * 3600
            }
            
        except Exception as e:
            logger.error(f"Error analyzing user behavior: {e}")
            return {
                "segment": UserSegment.NEW_USER,
                "engagement_score": 0.0,
                "retention_probability": 0.5,
                "lifetime_value": 0.0,
                "preferred_categories": [],
                "activity_patterns": {},
                "last_activity": time.time()
            }
    
    def determine_user_segment(self, days_since_creation: float, days_since_last_order: float, 
                             total_orders: int, total_spent: float, is_active: bool) -> UserSegment:
        """
        Определение сегмента пользователя
        """
        try:
            if not is_active:
                return UserSegment.CHURNED_USER
            
            if days_since_creation < 7:
                return UserSegment.NEW_USER
            
            if days_since_last_order > 30:
                return UserSegment.CHURNED_USER
            
            if days_since_last_order > 14:
                return UserSegment.POTENTIAL_CHURN
            
            if total_spent > 1000 or total_orders > 20:
                return UserSegment.VIP_USER
            
            return UserSegment.ACTIVE_USER
            
        except Exception as e:
            logger.error(f"Error determining user segment: {e}")
            return UserSegment.NEW_USER
    
    def calculate_engagement_score(self, events: List[Tuple], total_orders: int, achievement_points: int) -> float:
        """
        Расчет скора вовлеченности пользователя
        """
        try:
            if not events:
                return 0.0
            
            # Базовый скор на основе количества событий
            event_count = len(events)
            base_score = min(event_count / 100.0, 1.0)
            
            # Бонус за разнообразие событий
            event_types = set(event[0] for event in events)
            diversity_bonus = len(event_types) / 10.0
            
            # Бонус за покупки
            purchase_bonus = min(total_orders / 20.0, 0.5)
            
            # Бонус за достижения
            achievement_bonus = min(achievement_points / 1000.0, 0.3)
            
            total_score = base_score * 0.4 + diversity_bonus * 0.2 + purchase_bonus * 0.3 + achievement_bonus * 0.1
            
            return min(total_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {e}")
            return 0.0
    
    def calculate_retention_probability(self, segment: UserSegment, engagement_score: float, 
                                      days_since_last_order: float) -> float:
        """
        Расчет вероятности удержания пользователя
        """
        try:
            # Базовые вероятности по сегментам
            segment_probabilities = {
                UserSegment.NEW_USER: 0.7,
                UserSegment.ACTIVE_USER: 0.9,
                UserSegment.VIP_USER: 0.95,
                UserSegment.CHURNED_USER: 0.1,
                UserSegment.POTENTIAL_CHURN: 0.3
            }
            
            base_probability = segment_probabilities.get(segment, 0.5)
            
            # Корректировка на основе скора вовлеченности
            engagement_adjustment = engagement_score * 0.3
            
            # Корректировка на основе времени с последней активности
            time_adjustment = max(0, (30 - days_since_last_order) / 30.0) * 0.2
            
            total_probability = base_probability + engagement_adjustment + time_adjustment
            
            return min(max(total_probability, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating retention probability: {e}")
            return 0.5
    
    def calculate_lifetime_value(self, total_spent: float, total_orders: int, engagement_score: float) -> float:
        """
        Расчет пожизненной ценности пользователя
        """
        try:
            # Базовое значение на основе потраченных средств
            base_value = total_spent
            
            # Прогноз будущих трат на основе вовлеченности
            future_value = base_value * engagement_score * 2.0
            
            # Бонус за количество заказов
            order_bonus = total_orders * 10.0
            
            total_value = base_value + future_value + order_bonus
            
            return total_value
            
        except Exception as e:
            logger.error(f"Error calculating lifetime value: {e}")
            return 0.0
    
    def analyze_category_preferences(self, events: List[Tuple]) -> List[str]:
        """
        Анализ предпочтений по категориям
        """
        try:
            category_counts = {}
            
            for event in events:
                properties = json.loads(event[2]) if event[2] else {}
                category = properties.get("category")
                
                if category:
                    category_counts[category] = category_counts.get(category, 0) + 1
            
            # Сортировка по популярности
            sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            
            return [category for category, count in sorted_categories[:5]]
            
        except Exception as e:
            logger.error(f"Error analyzing category preferences: {e}")
            return []
    
    def analyze_activity_patterns(self, events: List[Tuple]) -> Dict[str, Any]:
        """
        Анализ паттернов активности пользователя
        """
        try:
            hourly_activity = {}
            daily_activity = {}
            
            for event in events:
                timestamp = event[3]
                dt = datetime.fromtimestamp(timestamp)
                
                hour = dt.hour
                day_of_week = dt.weekday()
                
                hourly_activity[hour] = hourly_activity.get(hour, 0) + 1
                daily_activity[day_of_week] = daily_activity.get(day_of_week, 0) + 1
            
            # Наиболее активные часы
            peak_hours = sorted(hourly_activity.items(), key=lambda x: x[1], reverse=True)[:3]
            
            # Наиболее активные дни
            peak_days = sorted(daily_activity.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return {
                "peak_hours": [hour for hour, count in peak_hours],
                "peak_days": [day for day, count in peak_days],
                "hourly_distribution": hourly_activity,
                "daily_distribution": daily_activity
            }
            
        except Exception as e:
            logger.error(f"Error analyzing activity patterns: {e}")
            return {}
    
    async def get_cohort_analysis(self, start_date: float, end_date: float) -> Dict[str, Any]:
        """
        Когортный анализ пользователей
        """
        try:
            # Получение данных о регистрациях по неделям
            registration_query = """
                SELECT 
                    DATE_TRUNC('week', created_at) as week,
                    COUNT(*) as registrations
                FROM users
                WHERE created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week
            """
            
            registration_results = self.db.execute(text(registration_query), {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            # Получение данных об активности по неделям
            activity_query = """
                SELECT 
                    DATE_TRUNC('week', u.created_at) as registration_week,
                    DATE_TRUNC('week', o.created_at) as activity_week,
                    COUNT(DISTINCT o.user_id) as active_users
                FROM users u
                JOIN orders o ON u.id = o.user_id
                WHERE u.created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE_TRUNC('week', u.created_at), DATE_TRUNC('week', o.created_at)
                ORDER BY registration_week, activity_week
            """
            
            activity_results = self.db.execute(text(activity_query), {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            # Формирование когортного анализа
            cohorts = {}
            for reg_week, reg_count in registration_results:
                week_key = reg_week.strftime("%Y-%m-%d")
                cohorts[week_key] = {
                    "registrations": reg_count,
                    "retention": {}
                }
            
            for reg_week, activity_week, active_users in activity_results:
                reg_week_key = reg_week.strftime("%Y-%m-%d")
                activity_week_key = activity_week.strftime("%Y-%m-%d")
                
                if reg_week_key in cohorts:
                    weeks_diff = (activity_week - reg_week).days // 7
                    cohorts[reg_week_key]["retention"][weeks_diff] = active_users
            
            return {
                "cohorts": cohorts,
                "analysis_period": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting cohort analysis: {e}")
            return {}
    
    async def get_funnel_analysis(self, funnel_name: str) -> Dict[str, Any]:
        """
        Анализ воронки конверсии
        """
        try:
            # Определение этапов воронки
            funnel_stages = {
                "registration": "user_registration",
                "first_login": "user_login",
                "first_search": "partner_search",
                "first_view": "partner_view",
                "first_order": "order_created"
            }
            
            funnel_data = {}
            
            for stage, event_name in funnel_stages.items():
                query = """
                    SELECT COUNT(DISTINCT user_id) as count
                    FROM analytics_events
                    WHERE event_name = :event_name
                    AND timestamp >= :start_date
                """
                
                start_date = time.time() - (30 * 24 * 3600)  # Последние 30 дней
                
                result = self.db.execute(text(query), {
                    "event_name": event_name,
                    "start_date": start_date
                }).fetchone()
                
                funnel_data[stage] = result[0] if result else 0
            
            # Расчет конверсии между этапами
            conversions = {}
            stages = list(funnel_data.keys())
            
            for i in range(len(stages) - 1):
                current_stage = stages[i]
                next_stage = stages[i + 1]
                
                current_count = funnel_data[current_stage]
                next_count = funnel_data[next_stage]
                
                if current_count > 0:
                    conversion_rate = next_count / current_count
                    conversions[f"{current_stage}_to_{next_stage}"] = {
                        "rate": conversion_rate,
                        "count": next_count
                    }
            
            return {
                "funnel_name": funnel_name,
                "stages": funnel_data,
                "conversions": conversions,
                "total_conversion": funnel_data["first_order"] / max(funnel_data["registration"], 1)
            }
            
        except Exception as e:
            logger.error(f"Error getting funnel analysis: {e}")
            return {}
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """
        Получение метрик в реальном времени
        """
        try:
            current_time = time.time()
            hour_ago = current_time - 3600
            day_ago = current_time - (24 * 3600)
            
            # Активные пользователи за последний час
            active_users_query = """
                SELECT COUNT(DISTINCT user_id) as count
                FROM analytics_events
                WHERE timestamp >= :hour_ago
            """
            
            active_users_result = self.db.execute(text(active_users_query), {
                "hour_ago": hour_ago
            }).fetchone()
            
            # События за последний час
            events_query = """
                SELECT 
                    event_type,
                    COUNT(*) as count
                FROM analytics_events
                WHERE timestamp >= :hour_ago
                GROUP BY event_type
            """
            
            events_results = self.db.execute(text(events_query), {
                "hour_ago": hour_ago
            }).fetchall()
            
            # Новые регистрации за последний день
            new_registrations_query = """
                SELECT COUNT(*) as count
                FROM users
                WHERE created_at >= :day_ago
            """
            
            new_registrations_result = self.db.execute(text(new_registrations_query), {
                "day_ago": day_ago
            }).fetchone()
            
            return {
                "active_users_last_hour": active_users_result[0] if active_users_result else 0,
                "events_last_hour": {
                    event_type: count for event_type, count in events_results
                },
                "new_registrations_last_day": new_registrations_result[0] if new_registrations_result else 0,
                "timestamp": current_time
            }
            
        except Exception as e:
            logger.error(f"Error getting real-time metrics: {e}")
            return {}

# Глобальный экземпляр сервиса аналитики
analytics_service = AnalyticsService(None)  # Будет инициализирован с реальной сессией БД
