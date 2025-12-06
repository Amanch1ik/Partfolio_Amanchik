<<<<<<< HEAD
# 🚀 YessBackend - Complete Loyalty Platform
<div align="center">
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)




**Полнофункциональная платформа лояльности с современным стеком технологий**



[Features](#-возможности) • [Quick Start](#-быстрый-старт) • [Documentation](#-документация) • [API](#-api-документация)
</div>



---

## 📋 Содержание
- [О проекте](#-о-проекте)
- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Быстрый старт](#-быстрый-старт)
- [Структура проекта](#-структура-проекта)
- [API Документация](#-api-документация)
- [Учетные данные](#-учетные-данные)
- [Технологии](#-технологии)
- [Разработка](#-разработка)
- [Deployment](#-deployment)

## 🎯 О проекте


**YessBackend** - это современная платформа лояльности, построенная на базе Clean Architecture с использованием .NET 10.0. Проект включает в себя полнофункциональный REST API, административную панель и партнерский дашборд.

### Основные компоненты

- 🎯 **Backend API** - Высокопроизводительный REST API на C# .NET 10.0
- 👨‍💼 **Admin Panel** - React приложение для управления системой
- 🤝 **Partner Dashboard** - React приложение для партнеров
- 💾 **PostgreSQL** - Надежная реляционная база данных
- ⚡ **Redis** - Быстрое кэширование и сессии

## ✨ Возможности
### 🔐 Backend (C# .NET 10.0)

- ✅ **RESTful API** с полной документацией Swagger/OpenAPI
- ✅ **JWT аутентификация** и role-based авторизация
- ✅ **Clean Architecture** - разделение на слои
- ✅ **Entity Framework Core** - современный ORM
- ✅ **PostgreSQL** - надежная база данных
- ✅ **Redis** - кэширование и сессии
- ✅ **Wallet система** - управление балансами и транзакциями
- ✅ **Реферальная система** - приглашения и бонусы
- ✅ **Управление партнерами** - локации, сотрудники, продукты
- ✅ **Промо-акции** - скидки и кэшбэк
- ✅ **Stories** - временный контент
- ✅ **Push уведомления** - информирование пользователей
- ✅ **Платежные провайдеры** - интеграция с платежными системами
- ✅ **Аудит** - логирование всех действий
- ✅ **Health checks** - мониторинг состояния системы

### 👨‍💼 Admin Panel (React + TypeScript)

- ✅ **Dashboard** - статистика и аналитика
- ✅ **Управление пользователями** - создание, редактирование, блокировка
- ✅ **Управление партнерами** - одобрение, управление, мониторинг
- ✅ **Транзакции** - просмотр и управление
- ✅ **Заказы** - мониторинг и управление
- ✅ **Уведомления** - массовая рассылка
- ✅ **Города** - управление локациями
- ✅ **Кошельки** - корректировка балансов
- ✅ **Отчеты** - аналитика и экспорт
- ✅ **Аудит** - история действий

### 🤝 Partner Dashboard (React + TypeScript):

- ✅ **Dashboard** - статистика продаж и доходов
- ✅ **Профиль партнера** - управление информацией
- ✅ **Продукты** - создание и управление каталогом
- ✅ **Заказы** - просмотр и обработка
- ✅ **Транзакции** - история платежей
- ✅ **Сотрудники** - управление персоналом
- ✅ **Локации** - управление точками продаж
- ✅ **Статистика** - аналитика продаж
- ✅ **Биллинг** - настройки оплаты

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├──────────────────────┬──────────────────────────────────────┤
│   Admin Panel        │      Partner Dashboard                │
│   (React + TS)       │      (React + TS)                     │
│   Port: 3001         │      Port: 3002                       │
└──────────┬───────────┴──────────────┬──────────────────────┘
           │                           │
           └───────────┬───────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API Gateway Layer                         │
│              C# Backend (ASP.NET Core)                       │
│                    Port: 8000                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   Auth   │  │  Admin   │  │ Partner  │                  │
│  │ Service  │  │ Service  │  │ Service  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└──────────┬───────────────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼──────┐ ┌───▼──────┐
│PostgreSQL│ │  Redis   │
│  :5432   │ │  :6379   │
└──────────┘ └──────────┘
```

### Clean Architecture Layers

```
YessBackend.Api (Presentation)
    ↓
YessBackend.Application (Business Logic)
    ↓
YessBackend.Domain (Entities)
    ↓
YessBackend.Infrastructure (Data Access)
```

## 🚀 Быстрый старт

### 📋 Требования

- [.NET 10.0 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

### 1️⃣ Клонирование репозитория

```bash
git clone https://github.com/Amanch1ik/YessBackend.git
cd YessBackend
```

### 2️⃣ Запуск инфраструктуры (PostgreSQL + Redis)

```powershell
cd YessBackend-master
docker-compose up -d postgres redis
```

### 3️⃣ Настройка базы данных

Миграции применяются автоматически при запуске приложения, или вручную:

```powershell
cd YessBackend-master\YessBackend.Api
dotnet ef database update
```

### 4️⃣ Запуск Backend

```powershell
cd YessBackend-master\YessBackend.Api
dotnet run
```

✅ Backend доступен на: **http://localhost:8000**  
📚 Swagger UI: **http://localhost:8000/docs**

### 5️⃣ Запуск Admin Panel

```powershell
cd panels-source\admin-panel
npm install
npm run dev
```

✅ Admin Panel доступна на: **http://localhost:3001**

### 6️⃣ Запуск Partner Panel

```powershell
cd panels-source\partner-panel
npm install
npm run dev
```

✅ Partner Panel доступна на: **http://localhost:3002**

## 📁 Структура проекта

```
YessBackend/
│
├── 📂 YessBackend-master/          # C# Backend Solution
│   ├── 📂 YessBackend.Api/         # Web API Layer (Controllers, Middleware)
│   ├── 📂 YessBackend.Application/ # Business Logic (Services, DTOs)
│   ├── 📂 YessBackend.Domain/      # Domain Models (Entities)
│   └── 📂 YessBackend.Infrastructure/ # Data Access (EF Core, Services)
│
├── 📂 panels-source/                # Frontend Applications
│   ├── 📂 admin-panel/              # Admin Panel (React + TypeScript)
│   └── 📂 partner-panel/            # Partner Dashboard (React + TypeScript)
│
├── 📄 README.md                     # Этот файл
├── 📄 .gitignore                    # Git ignore rules
└── 📄 docker-compose.yml            # Docker конфигурация
```

### Детальная структура Backend

```
YessBackend.Api/
├── Controllers/          # API Controllers
│   ├── v1/              # Version 1 endpoints
│   └── BaseApiController.cs
├── Middleware/          # Custom middleware
├── Program.cs           # Application entry point
└── appsettings.json     # Configuration

YessBackend.Application/
├── DTOs/                # Data Transfer Objects
│   ├── Admin/
│   ├── Auth/
│   ├── Partner/
│   └── ...
└── Services/            # Service interfaces

YessBackend.Domain/
└── Entities/            # Domain entities

YessBackend.Infrastructure/
├── Data/                # DbContext, Configurations
├── Migrations/          # EF Core migrations
└── Services/           # Service implementations
```

## 📚 API Документация
### 🔗 Основные ссылки
После запуска Backend доступны:
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health
- **OpenAPI JSON**: http://localhost:8000/swagger/v1/swagger.json


### 🔐 Аутентификация

#### Пользователь
```http
POST /api/v1/auth/login/json
Content-Type: application/json

{
  "phone": "+996551697296",
  "password": "Chillgu1"
}
```

#### Администратор
```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{
  "username": "aman4ikaitbekov@icloud.com",
  "password": "Chillgu1"
}
```
#### Партнер
```http
POST /api/v1/partner/auth/login
Content-Type: application/json

{
  "username": "aman4ikaitbekov@icloud.com",
  "password": "Chillgu1"
}
```

### 📊 Основные Endpoints

#### Admin API
- `GET /api/v1/admin/dashboard` - Статистика дашборда
- `GET /api/v1/admin/users` - Список пользователей
- `GET /api/v1/admin/partners` - Список партнеров
- `GET /api/v1/admin/transactions` - Транзакции
- `GET /api/v1/admin/orders` - Заказы
- `POST /api/v1/admin/users/{id}/activate` - Активация пользователя
- `POST /api/v1/admin/partners/{id}/approve` - Одобрение партнера

#### Partner API
- `GET /api/v1/partner/dashboard` - Дашборд партнера
- `GET /api/v1/partner/products` - Продукты партнера
- `GET /api/v1/partner/orders` - Заказы партнера
- `GET /api/v1/partner/transactions` - Транзакции партнера
- `POST /api/v1/partner/products` - Создание продукта
- `PUT /api/v1/partner/profile` - Обновление профиля

#### User API
- `POST /api/v1/auth/register` - Регистрация
- `GET /api/v1/wallet/balance` - Баланс кошелька
- `GET /api/v1/wallet/transactions` - История транзакций
- `GET /api/v1/partners` - Список партнеров
- `GET /api/v1/orders` - Заказы пользователя

## 🔑 Учетные данные

### 👨‍💼 Admin Panel

```
Email: aman4ikaitbekov@icloud.com
Phone: +996551697296
Password: Chillgu1
```

### 🤝 Partner Panel

```
Email: aman4ikaitbekov@icloud.com
Phone: +996551697296
Password: Chillgu1
```

> ⚠️ **Важно**: Эти учетные данные создаются автоматически при первом запуске через seed данные.

## 🛠️ Технологии

### Backend Stack

| Технология | Версия | Назначение |
|------------|--------|------------|
| [.NET](https://dotnet.microsoft.com/) | 10.0 | Основной фреймворк |
| [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) | 8.0 | Web API |
| [Entity Framework Core](https://docs.microsoft.com/ef/core/) | 8.0 | ORM |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | База данных |
| [Redis](https://redis.io/) | 7+ | Кэширование |
| [JWT](https://jwt.io/) | - | Аутентификация |
| [AutoMapper](https://automapper.org/) | - | Маппинг объектов |
| [Swagger/OpenAPI](https://swagger.io/) | - | Документация API |

### Frontend Stack

| Технология | Версия | Назначение |
|------------|--------|------------|
| [React](https://reactjs.org/) | 18+ | UI библиотека |
| [TypeScript](https://www.typescriptlang.org/) | 5+ | Типизация |
| [Vite](https://vitejs.dev/) | 5+ | Сборщик |
| [Ant Design](https://ant.design/) | 5+ | UI компоненты |
| [React Router](https://reactrouter.com/) | 6+ | Маршрутизация |
| [Axios](https://axios-http.com/) | - | HTTP клиент |
| [TanStack Query](https://tanstack.com/query) | - | Управление состоянием |

## 💻 Разработка

### Создание миграций

```powershell
cd YessBackend-master\YessBackend.Infrastructure
dotnet ef migrations add MigrationName --startup-project ..\YessBackend.Api --context ApplicationDbContext
```

### Применение миграций

```powershell
cd YessBackend-master\YessBackend.Api
dotnet ef database update --context ApplicationDbContext
```

### Запуск тестов

```powershell
dotnet test
```

### Сборка проекта

```powershell
cd YessBackend-master
dotnet build
```

### Запуск в режиме разработки

```powershell
cd YessBackend-master\YessBackend.Api
dotnet watch run
```

## 🐳 Deployment

### Docker Compose

```powershell
cd YessBackend-master
docker-compose up -d
```

### Docker Build

```powershell
docker build -t yess-backend:latest -f YessBackend-master/Dockerfile .
docker run -p 8000:8000 yess-backend:latest
```

### Environment Variables

Создайте файл `.env` или настройте переменные окружения:

```env
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=yess_db;Username=yess_user;Password=your_password
Redis__ConnectionString=localhost:6379
Jwt__SecretKey=your-secret-key-here
Jwt__Issuer=yess-loyalty
Jwt__Audience=yess-loyalty
```

## 📝 Лицензия

Этот проект является частной собственностью.



## 🙏 Благодарности

Спасибо всем, кто внес вклад в развитие проекта!

---

<div align="center">

**Сделано с ❤️ для Yess Loyalty Platform**

⭐ Если проект был полезен, поставьте звезду!

</div>
=======
>>>>>>> fbeca546db7463a04490b22dcaacce1d07a7fa06

