# 🚀 YESS! GO - Система лояльности

Современная платформа лояльности для Кыргызстана с веб-панелями, мобильным приложением и полнофункциональным API.

## 📋 Структура проекта

```
PANEL-s_YESS-Go-main/
├── panels-ts-v2/          # Frontend панели (React + TypeScript)
│   ├── admin-panel/        # Админ-панель (admin.yessgo.org)
│   ├── partner-panel/      # Панель партнёра (partner.yessgo.org)
│   └── shared/            # Общие компоненты и утилиты
├── yess-backend/          # Backend API (FastAPI + PostgreSQL)
│   ├── app/               # Основной код приложения
│   ├── alembic/           # Миграции БД
│   └── tests/             # Тесты
├── Yess-go-v2/            # Мобильное приложение (.NET MAUI)
├── k8s/                   # Kubernetes конфигурации
├── monitoring/             # Prometheus, Grafana конфиги
├── nginx/                 # Nginx конфигурация
├── bridge/                # Kubernetes bridge конфиги
├── docker-compose.yml      # Docker Compose для разработки
└── docker-compose.prod.yml # Docker Compose для production
```

## 🌐 Production домены

| Домен | Назначение |
|-------|-----------|
| `yessgo.org` / `www.yessgo.org` | Landing страница |
| `api.yessgo.org` | Backend API |
| `admin.yessgo.org` | Админ-панель (SPA) |
| `partner.yessgo.org` | Панель партнёра (SPA) |

## 🚀 Быстрый старт

### Development (Docker Compose)

```bash
# Запуск всего стека
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

**Доступные сервисы:**
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5433
- Redis: localhost:6380
- PgAdmin: http://localhost:5050

### Frontend панели

```bash
# Admin Panel
cd panels-ts-v2/admin-panel
npm install
npm run dev

# Partner Panel
cd panels-ts-v2/partner-panel
npm install
npm run dev
```

**Настройка API URL:**
Создайте `.env` файл в папке панели:
```env
VITE_API_URL=https://api.yessgo.org
```

## 📚 Документация

- [ARCHITECTURE.md](ARCHITECTURE.md) - Архитектура системы
- [TECHNICAL.md](TECHNICAL.md) - Техническая документация
- [QUICK_START_WINDOWS.md](QUICK_START_WINDOWS.md) - Быстрый старт для Windows
- [panels-ts-v2/README.md](panels-ts-v2/README.md) - Документация фронтенд панелей
- [yess-backend/README.md](yess-backend/README.md) - Документация бэкенда

## 🛠️ Технологии

### Backend
- **FastAPI** - современный веб-фреймворк
- **PostgreSQL** - основная БД
- **Redis** - кэширование
- **SQLAlchemy** - ORM
- **Alembic** - миграции

### Frontend
- **React 18** + **TypeScript 5**
- **Vite** - сборка
- **Ant Design** - UI компоненты
- **React Query** - управление данными
- **Zustand** - состояние

### Mobile
- **.NET MAUI** - кроссплатформенное приложение

## 📦 Production деплой

```bash
# Production сборка
docker-compose -f docker-compose.prod.yml up -d --build

# Kubernetes
kubectl apply -f k8s/
```

## 🔐 Безопасность

- JWT аутентификация
- Bcrypt для паролей
- CORS настройки
- Rate limiting
- HTTPS в production

## 📄 Лицензия

См. [LICENSE](LICENSE)

## 🤝 Поддержка

Для вопросов и поддержки создайте issue в репозитории.
