# Скрипт для запуска backend
Write-Host "🚀 Запуск Yess Backend..." -ForegroundColor Green
Write-Host ""

$backendPath = "Yess-Money---app-master\yess-backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Путь к бэкенду не найден: $backendPath" -ForegroundColor Red
    Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Set-Location $backendPath

# Проверка виртуального окружения
if (-not (Test-Path "venv")) {
    Write-Host "📦 Создание виртуального окружения..." -ForegroundColor Yellow
    python -m venv venv
}

# Активация venv
Write-Host "🔧 Активация виртуального окружения..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Проверка зависимостей
if (-not (Test-Path "venv\Scripts\uvicorn.exe")) {
    Write-Host "📥 Установка зависимостей..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "✅ Backend готов к запуску!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Сервер будет доступен на:" -ForegroundColor Cyan
Write-Host "   - http://localhost:8000" -ForegroundColor White
Write-Host "   - http://localhost:8000/docs (Swagger UI)" -ForegroundColor White
Write-Host "   - http://localhost:8000/health (Health Check)" -ForegroundColor White
Write-Host ""
Write-Host "📚 API Endpoints:" -ForegroundColor Cyan
Write-Host "   - POST /api/v1/partner/auth/login" -ForegroundColor White
Write-Host "   - GET  /api/v1/partner/me" -ForegroundColor White
Write-Host "   - GET  /api/v1/partner/users/search" -ForegroundColor White
Write-Host "   - GET  /api/v1/partner/dashboard/stats" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Нажмите Ctrl+C для остановки сервера" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 Запуск сервера..." -ForegroundColor Green
Write-Host ""

# Запуск сервера
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
