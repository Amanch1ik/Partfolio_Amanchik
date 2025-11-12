# Скрипт для проверки и запуска backend
Write-Host "🔍 Проверка Backend..." -ForegroundColor Blue

# Проверяем, запущен ли backend на порту 8000
$portCheck = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($portCheck) {
    Write-Host "✅ Backend уже запущен на порту 8000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Проверьте в браузере:" -ForegroundColor Yellow
    Write-Host "  - http://localhost:8000" -ForegroundColor Cyan
    Write-Host "  - http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "  - http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Хотите перезапустить backend? (y/n)"
    if ($response -ne "y") {
        exit 0
    }
    Write-Host "Остановите текущий процесс backend (Ctrl+C) и запустите снова" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Backend не запущен на порту 8000" -ForegroundColor Red
    Write-Host ""
    Write-Host "🚀 Запуск Backend..." -ForegroundColor Blue
}

$backendPath = "Yess-Money---app-master\yess-backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "✗ Путь к бэкенду не найден: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Проверка виртуального окружения
if (-not (Test-Path "venv")) {
    Write-Host "Создание виртуального окружения..." -ForegroundColor Yellow
    python -m venv venv
}

# Активация venv
Write-Host "Активация виртуального окружения..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Установка зависимостей если нужно
if (-not (Test-Path "venv\Scripts\uvicorn.exe")) {
    Write-Host "Установка зависимостей..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Запуск сервера
Write-Host ""
Write-Host "🚀 Запуск сервера на http://0.0.0.0:8000" -ForegroundColor Green
Write-Host "📚 API документация: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🏥 Health check: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Нажмите Ctrl+C для остановки" -ForegroundColor Yellow
Write-Host ""

uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

