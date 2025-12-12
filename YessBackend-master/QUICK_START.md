# Быстрый старт C# Backend

## Расположение
`E:\YessProject — копия\yess-backend-dotnet\`

## Запуск через Docker Compose (рекомендуется)

```bash
cd "E:\YessProject — копия\yess-backend-dotnet"
docker-compose up -d
```

## Проверка работы

1. **Health Check:**
   ```
   http://localhost:8000/api/v1/health
   ```

2. **Swagger (если включен):**
   ```
   http://localhost:8000/docs
   ```

3. **Корневой endpoint:**
   ```
   http://localhost:8000/
   ```

## Логи

Просмотр логов контейнера:
```bash
docker logs csharp-backend -f
```

## Остановка

```bash
docker-compose down
```

## Пересборка после изменений

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Конфигурация

Основные настройки в `YessBackend.Api/appsettings.json`:
- База данных PostgreSQL
- Redis
- JWT настройки
- CORS настройки

## Проблемы с frontend

Если возникает ошибка с `YessGoFrontV2\obj\Debug\net9.0-android\assets`:
```bash
cd "E:\YessProject — копия\YessGoFrontV2"
dotnet clean
dotnet restore
dotnet build
```

