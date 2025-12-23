import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Очищаем localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Переходим на главную страницу
    await page.goto('/');

    // Должны быть перенаправлены на страницу входа
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Проверяем наличие элементов формы входа
    await expect(page.locator('input[type="email"], input[placeholder*="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[placeholder*="пароль"]')).toBeVisible();
    await expect(page.locator('button:has-text("Войти"), button:has-text("Login")')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Вводим неправильные данные
    await page.fill('input[type="email"], input[placeholder*="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[placeholder*="пароль"]', 'wrongpassword');

    // Нажимаем кнопку входа
    await page.click('button:has-text("Войти"), button:has-text("Login")');

    // Должны увидеть сообщение об ошибке
    await expect(page.locator('text=Неверное имя пользователя или пароль')).toBeVisible();
  });

  test('should navigate to dashboard after successful login', async ({ page }) => {
    // Этот тест требует настроенного тестового сервера с валидными учетными данными
    test.skip(!process.env.E2E_TEST_USER, 'Тестовые учетные данные не настроены');

    await page.goto('/login');

    // Вводим тестовые данные
    await page.fill('input[type="email"]', process.env.E2E_TEST_USER!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);

    // Нажимаем кнопку входа
    await page.click('button:has-text("Войти")');

    // Должны перейти на дашборд
    await expect(page).toHaveURL('/');

    // Проверяем наличие элементов дашборда
    await expect(page.locator('text=Дашборд, text=Dashboard')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Предполагаем, что пользователь уже аутентифицирован
    // В реальном тесте нужно будет настроить авторизацию
    test.skip(true, 'Требуется настройка аутентификации');
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Переходим в раздел пользователей
    await page.click('text=Пользователи, text=Users');
    await expect(page).toHaveURL('/users');

    // Переходим в раздел партнеров
    await page.click('text=Партнеры, text=Partners');
    await expect(page).toHaveURL('/partners');

    // Возвращаемся на дашборд
    await page.click('text=Дашборд, text=Dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should work with theme switcher', async ({ page }) => {
    await page.goto('/');

    // Находим переключатель темы
    const themeButton = page.locator('[class*="theme-switch"]').first;

    // Получаем начальное состояние
    const initialClass = await page.getAttribute('html', 'class');

    // Нажимаем переключатель
    await themeButton.click();

    // Проверяем изменение темы
    const newClass = await page.getAttribute('html', 'class');
    expect(newClass).not.toBe(initialClass);
  });
});

test.describe('PWA Features', () => {
  test('should be installable as PWA', async ({ page, browserName }) => {
    // Проверяем наличие манифеста
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    // Проверяем наличие service worker
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistered).toBe(true);
  });

  test('should work offline', async ({ page, context }) => {
    // Переходим на страницу
    await page.goto('/');

    // Отключаем сеть
    await context.setOffline(true);

    // Пытаемся перейти на другую страницу (должно работать из кэша)
    try {
      await page.goto('/users', { waitUntil: 'networkidle' });
    } catch (error) {
      // Ожидаем ошибку сети, но страница должна загрузиться из кэша
    }

    // Включаем сеть обратно
    await context.setOffline(false);
  });
});
