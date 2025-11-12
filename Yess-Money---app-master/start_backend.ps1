# Скрипт для запуска Backend
Write-Host "Запуск Backend..." -ForegroundColor Green

# Переходим в директорию backend
$backendPath = "yess-backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "Ошибка: Директория yess-backend не найдена!" -ForegroundColor Red
    Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Убедитесь, что вы запускаете скрипт из директории Yess-Money---app-master" -ForegroundColor Yellow
    exit 1
}

Set-Location $backendPath
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Проверяем наличие виртуального окружения
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Активация виртуального окружения..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
    
    # Проверяем наличие email-validator и других критичных зависимостей
    Write-Host "Проверка зависимостей..." -ForegroundColor Yellow
    $emailValidator = python -c "import email_validator" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Установка недостающих зависимостей..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
} elseif (Test-Path "..\venv\Scripts\Activate.ps1") {
    Write-Host "Активация виртуального окружения из родительской директории..." -ForegroundColor Yellow
    & "..\venv\Scripts\Activate.ps1"
    
    # Проверяем наличие email-validator
    Write-Host "Проверка зависимостей..." -ForegroundColor Yellow
    $emailValidator = python -c "import email_validator" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Установка недостающих зависимостей..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
} else {
    Write-Host "Виртуальное окружение не найдено. Создание нового..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Активация виртуального окружения..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
    Write-Host "Установка зависимостей..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    if (Test-Path "env.example") {
        Write-Host "Создание .env из env.example..." -ForegroundColor Yellow
        Copy-Item "env.example" ".env"
        Write-Host "Пожалуйста, настройте .env файл перед запуском!" -ForegroundColor Yellow
    }
}

# Проверяем наличие app/main.py
if (-not (Test-Path "app\main.py")) {
    Write-Host "Ошибка: Файл app\main.py не найден!" -ForegroundColor Red
    Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Запускаем uvicorn
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Запуск сервера на http://localhost:8000" -ForegroundColor Green
Write-Host "Swagger UI: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "ReDoc: http://localhost:8000/redoc" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1

