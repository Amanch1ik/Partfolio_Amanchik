# Скрипт для запуска исправленной системы аутентификации
# Автор: AI Assistant
# Дата: 2025-11-05

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  YESS BACKEND - Запуск сервера" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка виртуального окружения
if (-not (Test-Path "venv")) {
    Write-Host "⚠️  Виртуальное окружение не найдено" -ForegroundColor Yellow
    Write-Host "Создаю виртуальное окружение..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Виртуальное окружение создано" -ForegroundColor Green
}

# Активация виртуального окружения
Write-Host "🔄 Активация виртуального окружения..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Проверка .env файла
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден" -ForegroundColor Yellow
    Write-Host "Создаю .env из env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Файл .env создан" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  ВАЖНО: Отредактируйте .env файл!" -ForegroundColor Red
    Write-Host "Установите правильные значения для:" -ForegroundColor Red
    Write-Host "  - DATABASE_URL" -ForegroundColor Red
    Write-Host "  - SECRET_KEY" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Продолжить запуск? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Проверка установленных пакетов
Write-Host "🔄 Проверка зависимостей..." -ForegroundColor Yellow
$pipList = pip list
if (-not ($pipList -match "fastapi")) {
    Write-Host "⚠️  Зависимости не установлены" -ForegroundColor Yellow
    Write-Host "Устанавливаю зависимости..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "✅ Зависимости установлены" -ForegroundColor Green
}

# Проверка базы данных
Write-Host "🔄 Проверка подключения к базе данных..." -ForegroundColor Yellow
try {
    # Попытка применить миграции
    alembic upgrade head
    Write-Host "✅ База данных готова" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ошибка при применении миграций" -ForegroundColor Red
    Write-Host "Убедитесь, что PostgreSQL запущен и настроен правильно" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Продолжить запуск? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Система аутентификации исправлена!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Доступные эндпоинты:" -ForegroundColor Yellow
Write-Host "  POST /api/v1/auth/register - Регистрация" -ForegroundColor White
Write-Host "  POST /api/v1/auth/login    - Вход" -ForegroundColor White
Write-Host "  GET  /api/v1/auth/me       - Текущий пользователь" -ForegroundColor White
Write-Host ""
Write-Host "Документация API:" -ForegroundColor Yellow
Write-Host "  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Тестирование:" -ForegroundColor Yellow
Write-Host "  python test_auth_api.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Запуск сервера
Write-Host "🚀 Запуск сервера..." -ForegroundColor Green
Write-Host ""
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

