@echo off
cd /d "%~dp0"

echo ========================================
echo Исправление и сборка проекта
echo ========================================
echo.

echo [1/4] Создание папки assets...
if not exist "obj\Debug\net9.0-android" mkdir "obj\Debug\net9.0-android"
if not exist "obj\Debug\net9.0-android\assets" mkdir "obj\Debug\net9.0-android\assets"
if not exist "obj\Debug\net9.0-android\android" mkdir "obj\Debug\net9.0-android\android"
if not exist "obj\Debug\net9.0-android\android\assets" mkdir "obj\Debug\net9.0-android\android\assets"
echo ✓ Папка assets создана
echo.

echo [2/4] Очистка проекта...
call dotnet clean -f net9.0-android >nul 2>&1
echo ✓ Проект очищен
echo.

echo [3/4] Восстановление зависимостей...
call dotnet restore -f net9.0-android
if errorlevel 1 (
    echo ✗ Ошибка при восстановлении
    pause
    exit /b 1
)
echo ✓ Зависимости восстановлены
echo.

echo [4/4] Сборка проекта...
call dotnet build -f net9.0-android -c Debug
if errorlevel 1 (
    echo.
    echo ✗ Ошибка при сборке
    echo.
    echo Попробуйте выполнить в Visual Studio: Build - Rebuild Solution
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ Проект успешно собран!
echo ========================================
echo.
echo Теперь можно запустить из Visual Studio:
echo   1. Откройте проект в Visual Studio
echo   2. Выберите Android эмулятор или устройство
echo   3. Нажмите F5 или кнопку "Start"
echo.
pause
