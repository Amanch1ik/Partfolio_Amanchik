# Скрипт для запуска Frontend (Admin Panel)
Write-Host "Запуск Admin Panel..." -ForegroundColor Green

# Переходим в директорию admin-panel
$adminPanelPath = "admin-panel"
if (-not (Test-Path $adminPanelPath)) {
    Write-Host "Ошибка: Директория admin-panel не найдена!" -ForegroundColor Red
    Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Убедитесь, что вы запускаете скрипт из директории Yess-Money---app-master" -ForegroundColor Yellow
    exit 1
}

Set-Location $adminPanelPath
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Проверяем наличие node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Установка зависимостей..." -ForegroundColor Yellow
    npm install
} else {
    # Проверяем наличие leaflet (для карты партнеров)
    if (-not (Test-Path "node_modules\leaflet")) {
        Write-Host "Установка зависимостей для карты (leaflet, react-leaflet)..." -ForegroundColor Yellow
        npm install leaflet react-leaflet @types/leaflet
    }
}

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-Host "Создание .env файла..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:8000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host ".env файл создан. API URL: http://localhost:8000" -ForegroundColor Cyan
}

# Запускаем dev сервер
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Запуск dev сервера на http://localhost:3001" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
npm run dev

