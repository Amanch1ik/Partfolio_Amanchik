"""
Database connection and session management with optimized pooling for high load
Оптимизировано для 4000+ одновременных пользователей
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine import Engine
from app.core.config import settings
import logging
import os

logger = logging.getLogger(__name__)

# Получаем настройки пула из переменных окружения или используем оптимизированные значения
# Для 4000+ пользователей рекомендуется: pool_size = max_connections / 10
# PostgreSQL по умолчанию имеет max_connections = 100
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 30))  # Увеличено для высокой нагрузки
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", 60))  # Дополнительные соединения
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", 3600))  # 1 час
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", 30))

# Оптимизированная конфигурация пула соединений для production с высокой нагрузкой
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI or settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_pre_ping=True,  # Проверка соединений перед использованием
    pool_size=POOL_SIZE,  # Основной размер пула (увеличено для 4000+ пользователей)
    max_overflow=MAX_OVERFLOW,  # Дополнительные соединения при нагрузке
    pool_recycle=POOL_RECYCLE,  # Переиспользование соединений каждый час
    pool_timeout=POOL_TIMEOUT,  # Таймаут получения соединения
    echo=False,  # Отключено логирование SQL в production
    connect_args={
        "connect_timeout": 10,
        "application_name": "yess_backend",
        "options": "-c statement_timeout=30000"  # Таймаут запроса 30 секунд
    },
    # Оптимизация для высокой нагрузки
    pool_reset_on_return='commit',  # Сброс соединения после использования
    isolation_level="READ COMMITTED"  # Уровень изоляции для лучшей производительности
)

# Обработчик событий для логирования медленных запросов
import time

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    if conn.info.get('query_start_time'):
        start_time = conn.info['query_start_time'].pop(-1)
        total = time.time() - start_time
        if total > 1.0:  # Логируем запросы дольше 1 секунды
            logger.warning(f"Slow query detected ({total:.2f}s): {statement[:100]}")
        # Также логируем очень медленные запросы (> 5 секунд)
        if total > 5.0:
            logger.error(f"Very slow query detected ({total:.2f}s): {statement[:200]}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_engine_stats():
    """Получение статистики пула соединений"""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalid()
    }
