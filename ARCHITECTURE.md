# 🏗️ Architecture Overview

## Clean Architecture

Проект следует принципам Clean Architecture с четким разделением на слои:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│         (YessBackend.Api)               │
│  - Controllers                          │
│  - Middleware                          │
│  - Configuration                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Application Layer                  │
│  (YessBackend.Application)              │
│  - Services (Interfaces)                │
│  - DTOs                                 │
│  - Business Logic                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Domain Layer                     │
│      (YessBackend.Domain)                │
│  - Entities                             │
│  - Value Objects                        │
│  - Domain Logic                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Infrastructure Layer               │
│  (YessBackend.Infrastructure)           │
│  - DbContext                            │
│  - Service Implementations             │
│  - External Services                    │
└─────────────────────────────────────────┘
```

## Data Flow

```
Client Request
    ↓
Controller (API Layer)
    ↓
Service Interface (Application Layer)
    ↓
Service Implementation (Infrastructure Layer)
    ↓
Repository / DbContext
    ↓
Database (PostgreSQL)
```

## Key Components

### Controllers
- Обрабатывают HTTP запросы
- Валидируют входные данные
- Возвращают HTTP ответы
- Используют DTOs для передачи данных

### Services
- Содержат бизнес-логику
- Независимы от инфраструктуры
- Определены через интерфейсы

### Entities
- Доменные модели
- Содержат бизнес-правила
- Не зависят от внешних библиотек

### Infrastructure
- Реализация сервисов
- Доступ к данным (EF Core)
- Внешние интеграции

## Design Patterns

- **Repository Pattern** - Абстракция доступа к данным
- **Dependency Injection** - Управление зависимостями
- **DTO Pattern** - Разделение доменных моделей и API моделей
- **Service Layer** - Инкапсуляция бизнес-логики
- **Unit of Work** - Управление транзакциями

## Database Schema

Основные сущности:
- `User` - Пользователи
- `Wallet` - Кошельки
- `Partner` - Партнеры
- `PartnerLocation` - Локации партнеров
- `PartnerProduct` - Продукты партнеров
- `Order` - Заказы
- `Transaction` - Транзакции
- `Promotion` - Промо-акции
- `Notification` - Уведомления

## Security

- **JWT Authentication** - Токены для аутентификации
- **Role-Based Authorization** - Контроль доступа по ролям
- **Password Hashing** - BCrypt для паролей
- **CORS** - Настройка кросс-доменных запросов
- **Rate Limiting** - Защита от злоупотреблений

## Caching Strategy

- **Redis** используется для:
  - Кэширования часто запрашиваемых данных
  - Хранения сессий
  - Rate limiting

## API Versioning

- Все API endpoints версионируются через `/api/v1/`
- Позволяет поддерживать обратную совместимость

---

Для детальной информации см. [README.md](README.md)

