# Скрипт для запуска всех компонентов проекта
# Использование: .\start_all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  YESS Money - Запуск всех сервисов" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Python
Write-Host "Проверка Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python не найден! Установите Python 3.8+" -ForegroundColor Red
    exit 1
}

# Проверка Node.js
Write-Host "Проверка Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js не найден! Установите Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Пути к проектам
$backendPath = "Yess-Money---app-master\yess-backend"
$adminPanelPath = "Yess-Money---app-master\admin-panel"
$partnerPanelPath = "Yess-Money---app-master\partner-panel"

# Функция для запуска бэкенда
function Start-Backend {
    Write-Host "🔧 Запуск Backend..." -ForegroundColor Blue
    
    if (-not (Test-Path $backendPath)) {
        Write-Host "✗ Путь к бэкенду не найден: $backendPath" -ForegroundColor Red
        return $false
    }
    
    Set-Location $backendPath
    
    # Проверка виртуального окружения
    if (-not (Test-Path "venv")) {
        Write-Host "  Создание виртуального окружения..." -ForegroundColor Yellow
        python -m venv venv
    }
    
    # Активация venv и установка зависимостей
    Write-Host "  Активация виртуального окружения..." -ForegroundColor Yellow
    & ".\venv\Scripts\Activate.ps1"
    
    if (-not (Test-Path "venv\Scripts\pip.exe")) {
        Write-Host "  Установка зависимостей..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
    
    # Запуск сервера в новом окне
    Write-Host "  Запуск сервера на http://localhost:8000..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
    
    Set-Location ..\..
    return $true
}

# Функция для запуска админ-панели
function Start-AdminPanel {
    Write-Host "👨‍💼 Запуск Admin Panel..." -ForegroundColor Magenta
    
    if (-not (Test-Path $adminPanelPath)) {
        Write-Host "✗ Путь к админ-панели не найден: $adminPanelPath" -ForegroundColor Red
        return $false
    }
    
    Set-Location $adminPanelPath
    
    # Проверка node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Установка зависимостей..." -ForegroundColor Yellow
        npm install
    }
    
    # Запуск в новом окне
    Write-Host "  Запуск на http://localhost:3001..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
    
    Set-Location ..\..
    return $true
}

# Функция для запуска партнер-панели
function Start-PartnerPanel {
    Write-Host "🤝 Запуск Partner Panel..." -ForegroundColor Cyan
    
    if (-not (Test-Path $partnerPanelPath)) {
        Write-Host "✗ Путь к партнер-панели не найден: $partnerPanelPath" -ForegroundColor Red
        return $false
    }
    
    Set-Location $partnerPanelPath
    
    # Проверка node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Установка зависимостей..." -ForegroundColor Yellow
        npm install
    }
    
    # Запуск в новом окне
    Write-Host "  Запуск на http://localhost:3002..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
    
    Set-Location ..\..
    return $true
}

# Запуск всех сервисов
Write-Host "Запуск сервисов..." -ForegroundColor Yellow
Write-Host ""

$backendStarted = Start-Backend
Start-Sleep -Seconds 2

$adminStarted = Start-AdminPanel
Start-Sleep -Seconds 2

$partnerStarted = Start-PartnerPanel
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Сервисы запущены!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Доступные адреса:" -ForegroundColor Cyan
if ($backendStarted) {
    Write-Host "  • Backend API:     http://localhost:8000" -ForegroundColor White
    Write-Host "  • API Docs:        http://localhost:8000/docs" -ForegroundColor White
}
if ($adminStarted) {
    Write-Host "  • Admin Panel:     http://localhost:3001" -ForegroundColor White
}
if ($partnerStarted) {
    Write-Host "  • Partner Panel:   http://localhost:3002" -ForegroundColor White
}
Write-Host ""
Write-Host "💡 Каждый сервис запущен в отдельном окне PowerShell" -ForegroundColor Yellow
Write-Host "   Закройте окна для остановки сервисов" -ForegroundColor Yellow
Write-Host ""
Write-Host "Нажмите любую клавишу для завершения..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

