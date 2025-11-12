param(
    [Parameter(Mandatory=$false)]
    [ValidateSet(1,2,3,4,5,6,7)]
    [int]$Action
)

function Check-DockerCompose {
    try {
        docker-compose --version | Out-Null
    }
    catch {
        Write-Host "Docker Compose не установлен. Пожалуйста, установите Docker Compose." -ForegroundColor Red
        exit 1
    }
}

function Start-Services {
    docker-compose up -d
    Write-Host "Сервисы запущены:" -ForegroundColor Green
    Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "- Backend (Swagger): http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "- PgAdmin: http://localhost:5050" -ForegroundColor Cyan
}

function Stop-Services {
    docker-compose down
    Write-Host "Все сервисы остановлены." -ForegroundColor Yellow
}

function Show-ServiceStatus {
    docker-compose ps
}

function Show-Logs {
    param([string]$Service)
    docker-compose logs -f $Service
}

function Show-Menu {
    Clear-Host
    Write-Host "===== Yess Loyalty Dev Environment =====" -ForegroundColor Magenta
    Write-Host "1. Запустить все сервисы" -ForegroundColor Green
    Write-Host "2. Остановить все сервисы" -ForegroundColor Red
    Write-Host "3. Перезапустить сервисы" -ForegroundColor Yellow
    Write-Host "4. Посмотреть статус служб" -ForegroundColor Cyan
    Write-Host "5. Посмотреть логи Backend" -ForegroundColor Blue
    Write-Host "6. Посмотреть логи Frontend" -ForegroundColor Blue
    Write-Host "7. Выйти" -ForegroundColor DarkRed
}

Check-DockerCompose

if ($Action) {
    switch ($Action) {
        1 { Start-Services }
        2 { Stop-Services }
        3 { 
            Stop-Services
            Start-Services 
        }
        4 { Show-ServiceStatus }
        5 { Show-Logs "backend" }
        6 { Show-Logs "frontend" }
        7 { exit 0 }
    }
}
else {
    do {
        Show-Menu
        $choice = Read-Host "Выберите действие (1-7)"
        
        switch ($choice) {
            '1' { Start-Services }
            '2' { Stop-Services }
            '3' { 
                Stop-Services
                Start-Services 
            }
            '4' { Show-ServiceStatus }
            '5' { Show-Logs "backend" }
            '6' { Show-Logs "frontend" }
            '7' { break }
            default { 
                Write-Host "Неверный выбор. Попробуйте снова." -ForegroundColor Red 
            }
        }
        
        if ($choice -ne '7') {
            Read-Host "Нажмите Enter для продолжения"
        }
    } while ($choice -ne '7')
}
