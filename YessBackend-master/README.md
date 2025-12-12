# YESS!GO💚Backend - C# (.NET 8)

Переписанный backend приложения YESS с Python (FastAPI) на C# (.NET 8).

## 🚀Быстрый старт

### Запуск через Docker (рекомендуется)

```powershell
#Сборка образа💻
docker build -t csharp-backend:latest .

# Запуск контейнера
docker run -d `
  --name csharp-backend `
  -p 8000:8000 `
  -p 8443:8443 `
  -e ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=yess_db;Username=yess_user;Password=your_password" `
  -e Redis__ConnectionString="localhost:6379" `
  csharp-backend:latest
```

### Запуск через Docker Compose

```powershell
docker-compose up -d
```

Это запустит:
- PostgreSQL на порту 5432
- Redis на порту 6379
- C# Backend на порту 8000


### Прямой запуск (Development)

```powershell
cd YessBackend.Api
dotnet run
```

API будет доступен на `http://localhost:8000` и `https://localhost:8443`

## 📋Endpoints

- **Swagger UI**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`
- **Database Health**: `http://localhost:8000/health/db`

## ⚙️ Конфигурация

Настройки находятся в `YessBackend.Api/appsettings.json`:

- `ConnectionStrings:DefaultConnection` - строка подключения к PostgreSQL
- `Jwt:*` - настройки JWT токенов
- `Redis:ConnectionString` - строка подключения к Redis
- `Cors:Origins` - разрешенные источники для CORS


## 📦 Структура проекта

```
YessBackend.sln
├── YessBackend.Api/          # ASP.NET Core Web API
├── YessBackend.Application/  # Бизнес-логика и DTOs
├── YessBackend.Domain/       # Доменные модели
└── YessBackend.Infrastructure/ # Реализация сервисов и доступ к данным
```

## 🔧 Технологии

- .NET 8.0
- ASP.NET Core Web API
- Entity Framework Core 8 (PostgreSQL)
- JWT Authentication
- Redis (кэширование)
- AutoMapper
- Swagger/OpenAPI

## 📚 Документация

- `REWRITE_SUMMARY.md` - полное резюме переписывания
- `DEPLOYMENT.md` - инструкции по развертыванию на Ubuntu
- `YessBackend.Infrastructure/Migrations/README.md` - работа с миграциями

## ✅ Соответствие Python API

Все endpoints полностью совместимы с оригинальной Python версией.

## 🐳 Docker

Образ называется **`csharp-backend`** и слушает на портах:
- **HTTP**: 8000
- **HTTPS**: 8443
