# YESS! GO - Панели управления

Веб-панели для системы лояльности YESS! GO.

## Структура проекта

- **admin-panel/** - Админ-панель (порт 3003)
- **partner-panel/** - Партнерская панель (порт 3001)

## Технологии

- React 18 + TypeScript
- Vite
- Ant Design 5.12
- React Query
- Zustand

## Быстрый старт

### Установка зависимостей

```bash
# Admin Panel
cd admin-panel
npm install

# Partner Panel
cd partner-panel
npm install
```

### Запуск в режиме разработки

```bash
# Admin Panel
cd admin-panel
npm run dev

# Partner Panel
cd partner-panel
npm run dev
```

Панели будут доступны:
- Admin Panel: http://localhost:3003
- Partner Panel: http://localhost:3001

### Сборка для production

```bash
cd admin-panel
npm run build

cd partner-panel
npm run build
```

## Переменные окружения

Создайте `.env` файл в каждой панели:

```env
VITE_API_URL=http://localhost:8000
VITE_ENV=development
VITE_WS_ENABLED=false
VITE_TRANSIT_ENABLED=true
```

## Docker

Каждая панель имеет свой `Dockerfile` для сборки production образов.

