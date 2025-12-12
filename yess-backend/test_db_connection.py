#!/usr/bin/env python3
"""
Скрипт для проверки подключения к базе данных
Использование: python test_db_connection.py
"""
import os
import sys

# Добавляем путь к приложению
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import SessionLocal, engine
from sqlalchemy import text
import traceback

def test_database_connection():
    """Тест подключения к базе данных"""
    print("=" * 60)
    print("🔍 Проверка подключения к базе данных")
    print("=" * 60)
    print()
    
    # Показываем конфигурацию
    print("📋 Конфигурация базы данных:")
    print(f"   Host: {settings.POSTGRES_HOST}")
    print(f"   User: {settings.POSTGRES_USER}")
    print(f"   Database: {settings.POSTGRES_DB}")
    print(f"   Password: {'*' * len(settings.POSTGRES_PASSWORD) if settings.POSTGRES_PASSWORD else 'NOT SET'}")
    print()
    
    db_uri = settings.SQLALCHEMY_DATABASE_URI or settings.DATABASE_URL
    if db_uri:
        # Скрываем пароль в выводе
        safe_uri = db_uri.split('@')[0].split('//')[0] + '//***@' + '@'.join(db_uri.split('@')[1:]) if '@' in db_uri else db_uri
        print(f"   Database URL: {safe_uri}")
    else:
        print("   Database URL: NOT CONFIGURED")
    print()
    
    # Тест подключения
    print("🔌 Попытка подключения...")
    db = None
    try:
        db = SessionLocal()
        
        # Простой запрос
        result = db.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        
        if row and row[0] == 1:
            print("   ✅ Подключение успешно!")
            print()
            
            # Получаем информацию о базе данных
            print("📊 Информация о базе данных:")
            try:
                version_result = db.execute(text("SELECT version()"))
                pg_version = version_result.fetchone()[0]
                print(f"   PostgreSQL версия: {pg_version.split(',')[0]}")
                
                db_info_result = db.execute(text("""
                    SELECT 
                        current_database() as db_name,
                        current_user as db_user,
                        inet_server_addr() as server_address,
                        inet_server_port() as server_port
                """))
                db_info = db_info_result.fetchone()
                
                if db_info:
                    print(f"   Имя базы данных: {db_info[0]}")
                    print(f"   Пользователь: {db_info[1]}")
                    print(f"   Адрес сервера: {db_info[2] if db_info[2] else 'localhost'}")
                    print(f"   Порт: {db_info[3] if db_info[3] else '5432'}")
                
                # Проверка таблиц
                tables_result = db.execute(text("""
                    SELECT COUNT(*) as table_count 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
                table_count = tables_result.fetchone()[0]
                print(f"   Количество таблиц: {table_count}")
                
            except Exception as e:
                print(f"   ⚠️  Не удалось получить детальную информацию: {str(e)}")
            
            print()
            print("✅ Все проверки пройдены успешно!")
            return True
            
    except Exception as e:
        print()
        print("❌ ОШИБКА ПОДКЛЮЧЕНИЯ!")
        print(f"   Тип ошибки: {type(e).__name__}")
        print(f"   Сообщение: {str(e)}")
        print()
        print("🔧 Возможные решения:")
        print("   1. Убедитесь, что PostgreSQL запущен")
        print("   2. Проверьте правильность пароля в настройках")
        print("   3. Проверьте, что хост '{}' доступен".format(settings.POSTGRES_HOST))
        print("   4. Если используете Docker, убедитесь, что контейнер запущен")
        print("   5. Проверьте переменные окружения (DATABASE_URL, POSTGRES_*)")
        print()
        print("📝 Детали ошибки:")
        traceback.print_exc()
        return False
        
    finally:
        if db:
            try:
                db.close()
            except:
                pass
    
    print("=" * 60)
    return False

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)

