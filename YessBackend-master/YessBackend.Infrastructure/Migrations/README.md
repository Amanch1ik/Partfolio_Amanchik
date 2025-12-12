# EF Core Migrations

## Создание миграции

```bash
cd YessBackend.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../YessBackend.Api
```

## Применение миграции

```bash
cd YessBackend.Infrastructure
dotnet ef database update --startup-project ../YessBackend.Api
```

## Важно

⚠️ **Этот проект использует существующую PostgreSQL базу данных!**

Перед созданием миграций убедитесь, что:
1. Модели в `YessBackend.Domain.Entities` соответствуют существующим таблицам в БД
2. Все связи и индексы настроены правильно
3. Применение миграций не изменит структуру существующих таблиц

## Рекомендация

Если база данных уже существует, можно:
1. Отключить автоматическое применение миграций при старте
2. Использовать миграции только для синхронизации схемы
3. Или создать пустую миграцию с текущей схемой БД

