# 🎯 YESS!Partner - Система лояльности

<div align="center">

![YESS!Partner](https://img.shields.io/badge/YESS!Partner-v1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![React](https://img.shields.io/badge/React-18.0+-blue)

**Современная система лояльности с админ-панелью и партнерской панелью**

[🚀 Быстрый старт](#-быстрый-старт) • [📚 Документация](#-документация) • [🏗️ Архитектура](#️-архитектура) • [🔧 Технологии](#-технологии)

</div>

---

## 📋 О проекте

**YESS!Partner** — полнофункциональная система лояльности, включающая:

- 🎨 **Админ-панель** — управление пользователями, партнерами, транзакциями
- 🤝 **Партнерская панель** — управление локациями, акциями, сотрудниками
- 💰 **Система начисления Yess!Coin** — виртуальная валюта для поощрения клиентов
- 🏪 **Интеграция с партнерами** — управление акциями и промо-кампаниями
- 📱 **Мобильное приложение** — .NET MAUI приложение для пользователей

## 🚀 Быстрый старт

### Предварительные требования

- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Redis 6+** (опционально, для кэширования)

### Установка и запуск

#### 1. Клонирование репозитория

```bash
git clone https://github.com/Amanch1ik/PANEL-s_YESS-Go.git
cd PANEL-s_YESS-Go
```

#### 2. Настройка Backend

```bash
# Перейдите в директорию backend
cd Yess-Money---app-master/yess-backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте виртуальное окружение
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt

# Создайте .env файл из примера
copy env.example .env  # Windows
# или
cp env.example .env    # Linux/Mac

# Настройте переменные окружения в .env
# (DATABASE_URL, SECRET_KEY, и т.д.)

# Примените миграции
alembic upgrade head

# Запустите сервер
uvicorn app.main:app --reload --port 8000
```

**Backend будет доступен:**
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

#### 3. Настройка Admin Panel

```bash
# Перейдите в директорию admin-panel
cd Yess-Money---app-master/admin-panel

# Установите зависимости
npm install

# Создайте .env файл
echo "VITE_API_URL=http://localhost:8000" > .env

# Запустите dev сервер
npm run dev
```

**Admin Panel будет доступен:** `http://localhost:3001`

#### 4. Настройка Partner Panel

```bash
# Перейдите в директорию partner-panel
cd Yess-Money---app-master/partner-panel

# Установите зависимости
npm install

# Создайте .env файл
echo "VITE_API_URL=http://localhost:8000" > .env

# Запустите dev сервер
npm run dev
```

**Partner Panel будет доступен:** `http://localhost:3002`

### Использование скриптов (Windows PowerShell)

Для быстрого запуска используйте готовые скрипты:

```powershell
# Запуск Backend
.\Yess-Money---app-master\start_backend.ps1

# Запуск Admin Panel
.\Yess-Money---app-master\start_admin.ps1

# Запуск Partner Panel
.\Yess-Money---app-master\start_partner.ps1

# Запуск всего сразу
.\Yess-Money---app-master\start_all.ps1
```

## 🏗️ Архитектура

```
YESS!Partner/
├── yess-backend/          # FastAPI Backend
│   ├── app/               # Основное приложение
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Конфигурация, безопасность
│   │   ├── models/        # SQLAlchemy модели
│   │   ├── schemas/       # Pydantic схемы
│   │   └── services/      # Бизнес-логика
│   ├── alembic/           # Миграции БД
│   └── tests/             # Тесты
│
├── admin-panel/           # React + TypeScript Admin Panel
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы
│   │   ├── services/      # API сервисы
│   │   └── styles/        # Стили
│
├── partner-panel/         # React + TypeScript Partner Panel
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы
│   │   ├── services/      # API сервисы
│   │   └── styles/        # Стили
│
├── YessLoyaltyApp/        # .NET MAUI Mobile App
│   ├── Services/           # Сервисы
│   ├── ViewModels/        # MVVM ViewModels
│   └── Views/             # XAML Views
│
├── k8s/                   # Kubernetes конфигурации
├── monitoring/            # Prometheus & Grafana
└── nginx/                 # Nginx конфигурации
```

## 🔧 Технологии

### Backend
- **FastAPI** — современный веб-фреймворк для Python
- **SQLAlchemy** — ORM для работы с БД
- **Alembic** — миграции БД
- **PostgreSQL** — основная БД
- **Redis** — кэширование и очереди
- **JWT** — аутентификация
- **Pydantic** — валидация данных

### Frontend
- **React 18** — UI библиотека
- **TypeScript** — типизированный JavaScript
- **Vite** — сборщик и dev-сервер
- **Ant Design** — UI компоненты
- **React Query** — управление состоянием и кэширование
- **React Router** — маршрутизация

### Mobile
- **.NET MAUI** — кроссплатформенное мобильное приложение
- **C#** — язык программирования

### DevOps
- **Docker** — контейнеризация
- **Kubernetes** — оркестрация
- **Prometheus** — мониторинг
- **Grafana** — визуализация метрик
- **Nginx** — reverse proxy

## 📚 Документация

### API Документация

После запуска backend доступна интерактивная документация:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Основные API Endpoints

#### Аутентификация
```http
POST /api/v1/auth/login
POST /api/v1/auth/register
```

#### Пользователи
```http
GET /api/v1/users/me
PUT /api/v1/users/me
```

#### Партнеры
```http
GET /api/v1/partners
GET /api/v1/partners/{id}
GET /api/v1/partners/nearby
```

#### Транзакции
```http
GET /api/v1/transactions
POST /api/v1/transactions
```

#### Кошелек
```http
GET /api/v1/wallet
GET /api/v1/wallet/balance
POST /api/v1/wallet/topup
```

Полная документация доступна в Swagger UI.

### Переменные окружения

Создайте файл `.env` в `yess-backend/` на основе `env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yess_db

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3002

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
```

## 🧪 Тестирование

### Backend тесты

```bash
cd yess-backend
pytest tests/
```

### Frontend тесты

```bash
cd admin-panel
npm test

cd partner-panel
npm test
```

## 🚢 Деплой

### Docker

```bash
# Сборка образов
docker-compose build

# Запуск
docker-compose up -d
```

### Kubernetes

```bash
# Применение конфигураций
kubectl apply -f k8s/
```

## 📊 Мониторинг

- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3000`
- **Health Check**: `http://localhost:8000/health`

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 👥 Авторы

- **Amanch1ik** - [GitHub](https://github.com/Amanch1ik)

## 🙏 Благодарности

- FastAPI сообществу
- React сообществу
- Всем контрибьюторам проекта

---

<div align="center">

**Сделано с ❤️ для YESS!Partner**

⭐ Если проект был полезен, поставьте звезду!

</div>
