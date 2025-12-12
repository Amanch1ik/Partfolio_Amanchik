param(
    [switch]$Verbose = $false
)

# Цветной вывод
function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$Color = 'White'
    )
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $originalColor
}

# Проверка и установка виртуальных окружений
function Initialize-Environments {
    # Backend (Python venv)
    if (-not (Test-Path "yess-backend/venv")) {
        Write-ColorOutput "🐍 Создание виртуального окружения для Backend..." Yellow
        Set-Location yess-backend
        python -m venv venv
        .\venv\Scripts\Activate.ps1
        pip install -r requirements.txt
        Set-Location ..
    }

    # Frontend (npm)
    if (-not (Test-Path "frontend/node_modules")) {
        Write-ColorOutput "📦 Установка зависимостей Frontend..." Yellow
        Set-Location frontend
        npm install
        Set-Location ..
    }
}

# Запуск фронтенда
function Start-Frontend {
    Write-ColorOutput "🚀 Запуск Frontend..." Green
    Set-Location frontend
    Start-Process powershell -ArgumentList "npm start" -NoNewWindow
    Set-Location ..
}

# Запуск бэкенда
function Start-Backend {
    Write-ColorOutput "🔧 Запуск Backend..." Blue
    Set-Location yess-backend
    Start-Process powershell -ArgumentList ".\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload" -NoNewWindow
    Set-Location ..
}

# Открытие приложений
function Open-Applications {
    Start-Process "http://localhost:3000"  # Frontend
    Start-Process "http://localhost:8000/docs"  # Backend Swagger
}

# Мониторинг процессов
function Watch-Processes {
    Write-ColorOutput "`n🔍 Мониторинг процессов:" Cyan
    while ($true) {
        $frontendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
        $backendProcess = Get-Process -Name "python" -ErrorAction SilentlyContinue

        if (-not $frontendProcess) {
            Write-ColorOutput "❌ Frontend остановлен. Перезапуск..." Red
            Start-Frontend
        }

        if (-not $backendProcess) {
            Write-ColorOutput "❌ Backend остановлен. Перезапуск..." Red
            Start-Backend
        }

        Start-Sleep -Seconds 10
    }
}

# Главная функция
function Start-DevEnvironment {
    Clear-Host
    Write-ColorOutput "===== Yess Loyalty Dev Environment =====" Magenta
    
    # Проверка Prerequisites
    try {
        python --version | Out-Null
        node --version | Out-Null
        npm --version | Out-Null
    }
    catch {
        Write-ColorOutput "❌ Необходимо установить Python, Node.js и npm!" Red
        exit 1
    }

    # Инициализация окружений
    Initialize-Environments

    # Запуск служб
    Start-Backend
    Start-Frontend
    Open-Applications

    Write-ColorOutput "`n🌟 Разработка запущена!" Green
    Write-ColorOutput "Frontend: http://localhost:3000" Cyan
    Write-ColorOutput "Backend (Swagger): http://localhost:8000/docs" Cyan
    
    # Verbose режим для отладки
    if ($Verbose) {
        Watch-Processes
    }
    else {
        Read-Host "Нажмите Enter для завершения..."
    }
}

# Запуск
Start-DevEnvironment
