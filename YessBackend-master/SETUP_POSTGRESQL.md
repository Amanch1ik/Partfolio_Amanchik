# Настройка PostgreSQL для Yess Backend

## Проблема

Backend не может подключиться к PostgreSQL из-за неправильного пароля, поэтому миграции не применяются и таблицы не создаются.

## ✅ Быстрое решение

### Вариант 1: Использовать Docker Compose (РЕКОМЕНДУЕТСЯ - самый простой способ)

```bash
cd yess-backend-dotnet
START_POSTGRESQL.bat
```

Или вручную:
```bash
docker-compose up -d postgres
```

Это создаст PostgreSQL с:
- Пользователь: `yess_user`
- Пароль: `secure_password`
- База данных: `yess_db`

**ВАЖНО**: После запуска через Docker обновите connection string в `appsettings.json`:
```json
"DefaultConnection": "Host=localhost;Port=5432;Database=yess_db;Username=yess_user;Password=secure_password"
```

### Вариант 2: Использовать локальный PostgreSQL

Connection string уже настроен на пароль `password` в `appsettings.json`.

Создайте пользователя и базу данных:

**Способ A: Использовать SQL скрипт**
```bash
psql -U postgres -f SETUP_POSTGRESQL.sql
```

**Способ B: Вручную через psql**
```sql
-- Подключитесь к PostgreSQL как суперпользователь
psql -U postgres

-- Выполните команды:
CREATE USER yess_user WITH PASSWORD 'password';
CREATE DATABASE yess_db OWNER yess_user;
GRANT ALL PRIVILEGES ON DATABASE yess_db TO yess_user;
\q
```

**Способ C: Использовать bat-скрипт**
```bash
SETUP_POSTGRESQL.bat
```

### Вариант 3: Использовать существующую базу данных

Если у вас уже есть PostgreSQL, обновите пароль в `appsettings.json` на правильный.

## После настройки PostgreSQL

1. **Запустите backend:**
   ```bash
   cd yess-backend-dotnet
   dotnet run --project YessBackend.Api\YessBackend.Api.csproj
   ```

2. **Миграции применятся автоматически при старте** - вы увидите в логах:
   ```
   Применение 1 ожидающих миграций...
     - 20251122144127_InitialCreate
   Миграции успешно применены.
   ```

3. **Проверьте, что таблицы созданы:**
   ```sql
   psql -U yess_user -d yess_db
   \dt
   ```

Должны быть видны таблицы: `users`, `wallets`, `partners`, `orders`, `transactions`, `order_items`, `partner_products` и другие.

## Проверка подключения

После запуска backend проверьте логи - не должно быть ошибок подключения к PostgreSQL.
Если видите ошибку `28P01: password authentication failed`, значит пароль не совпадает.

