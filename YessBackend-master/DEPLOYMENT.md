# Руководство по развертыванию на Ubuntu

## Требования

- Ubuntu 20.04 или выше
- .NET 8.0 Runtime
- PostgreSQL 12+
- Redis (опционально, для кэширования)

## Установка .NET 8.0 на Ubuntu

```bash
# Добавляем Microsoft package repository
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# Устанавливаем .NET 8.0 Runtime
sudo apt-get update
sudo apt-get install -y dotnet-runtime-8.0 aspnetcore-runtime-8.0
```

## Развертывание

### Вариант 1: Публикация и запуск напрямую

```bash
# Публикация приложения
cd YessBackend.Api
dotnet publish -c Release -o /var/www/yess-backend

# Настройка appsettings.json
cp appsettings.json appsettings.Production.json
# Отредактируйте appsettings.Production.json с реальными настройками

# Установка переменных окружения
export ASPNETCORE_ENVIRONMENT=Production
export ASPNETCORE_URLS=http://0.0.0.0:5000;https://0.0.0.0:5001

# Запуск
dotnet YessBackend.Api.dll
```

### Вариант 2: Использование systemd service

Создайте файл `/etc/systemd/system/yess-backend.service`:

```ini
[Unit]
Description=YESS Backend API
After=network.target postgresql.service

[Service]
Type=notify
WorkingDirectory=/var/www/yess-backend
ExecStart=/usr/bin/dotnet /var/www/yess-backend/YessBackend.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=yess-backend
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

Запуск сервиса:

```bash
sudo systemctl enable yess-backend
sudo systemctl start yess-backend
sudo systemctl status yess-backend
```

### Вариант 3: Docker

```bash
# Сборка образа
docker build -t yess-backend:latest .

# Запуск контейнера
docker run -d \
  --name yess-backend \
  -p 5000:80 \
  -p 5001:443 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__DefaultConnection="Host=postgres;Database=yess_db;Username=yess_user;Password=..." \
  yess-backend:latest
```

## Настройка HTTPS

### Использование Let's Encrypt (рекомендуется)

```bash
# Установка Certbot
sudo apt-get install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot certonly --standalone -d yourdomain.com

# Настройка в appsettings.Production.json
"Kestrel": {
  "Endpoints": {
    "Https": {
      "Url": "https://0.0.0.0:443",
      "Certificate": {
        "Path": "/etc/letsencrypt/live/yourdomain.com/fullchain.pem",
        "KeyPath": "/etc/letsencrypt/live/yourdomain.com/privkey.pem"
      }
    }
  }
}
```

### Использование собственного сертификата

Поместите сертификат и ключ в защищенную директорию и настройте пути в `appsettings.Production.json`.

## Проверка работоспособности

```bash
# Health check
curl http://localhost:5000/health

# Database health check
curl http://localhost:5000/health/db

# API endpoint
curl http://localhost:5000/api/v1/partner/list
```

## Логирование

Логи доступны через:

```bash
# systemd logs
sudo journalctl -u yess-backend -f

# Docker logs
docker logs -f yess-backend
```

## Мониторинг

Рекомендуется использовать:
- Systemd для управления процессом
- Nginx как reverse proxy (опционально)
- Prometheus для метрик (если настроено)
- Sentry для отслеживания ошибок (если настроено)

