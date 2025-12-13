# ⚡ Быстрый старт для Windows

## 🚀 Запуск панелей (1 команда)

### Из корня проекта (D:\YessBackend-master):

```powershell
docker-compose up -d
```

**Готово!** Панели будут доступны:
- 👨‍💼 Admin Panel: http://localhost:8083
- 🤝 Partner Panel: http://localhost:8081
- 🔧 Backend API: http://localhost:8000

## 🔍 Проверка

```powershell
# Проверить статус
docker-compose ps

# Проверить health checks
Invoke-WebRequest -Uri http://localhost:8083/health
Invoke-WebRequest -Uri http://localhost:8081/health

# Открыть в браузере
Start-Process http://localhost:8083
Start-Process http://localhost:8081
```

## 📦 Production деплой

### Вариант 1: Docker Compose (проще всего)

```powershell
# Из корня проекта
docker-compose -f docker-compose.prod.yml up -d --build
```

### Вариант 2: PowerShell скрипт

```powershell
cd panels-ts-v2
.\deploy.ps1 all production
```

## 🛠️ Полезные команды

```powershell
# Просмотр логов
docker-compose logs -f admin-panel
docker-compose logs -f partner-panel

# Остановить все
docker-compose down

# Перезапустить
docker-compose restart admin-panel partner-panel

# Использование ресурсов
docker stats
```

## ❓ Проблемы?

1. **Docker не запускается?** 
   - Убедитесь, что Docker Desktop запущен

2. **Порт занят?**
   ```powershell
   netstat -ano | findstr :8083
   ```

3. **Ошибки при сборке?**
   ```powershell
   docker-compose build --no-cache
   ```

---

**Подробная документация:** `panels-ts-v2/DEPLOY_WINDOWS.md`

