-- Скрипт для настройки PostgreSQL для Yess Backend
-- Запустите этот скрипт от имени суперпользователя PostgreSQL (postgres)

-- Создание пользователя (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'yess_user') THEN
        CREATE USER yess_user WITH PASSWORD 'password';
        RAISE NOTICE 'Пользователь yess_user создан';
    ELSE
        RAISE NOTICE 'Пользователь yess_user уже существует';
    END IF;
END
$$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE yess_db OWNER yess_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yess_db')\gexec

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE yess_db TO yess_user;

-- Подключение к базе данных и предоставление прав на схему
\c yess_db

GRANT ALL ON SCHEMA public TO yess_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO yess_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO yess_user;

\echo ========================================
\echo Настройка PostgreSQL завершена!
\echo ========================================
\echo Пользователь: yess_user
\echo Пароль: password
\echo База данных: yess_db
\echo ========================================

