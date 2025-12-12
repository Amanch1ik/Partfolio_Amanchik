@echo off
echo ========================================
echo Исправление и сборка для Visual Studio
echo ========================================
cd /d "%~dp0"

echo [1/3] Создание папки assets...
if not exist "obj\Debug\net9.0-android\assets" mkdir "obj\Debug\net9.0-android\assets"
echo ✓ Готово

echo [2/3] Очистка и восстановление...
dotnet clean -f net9.0-android >nul 2>&1
dotnet restore -f net9.0-android
if errorlevel 1 exit /b 1
echo ✓ Готово

echo [3/3] Сборка проекта...
dotnet build -f net9.0-android -c Debug
if errorlevel 1 (
    echo.
    echo ✗ Ошибка сборки. Откройте Visual Studio и выполните:
    echo   Build - Rebuild Solution
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ Проект собран успешно!
echo ========================================
echo.
echo Теперь в Visual Studio:
echo   1. Откройте проект
echo   2. Выберите Android платформу
echo   3. Нажмите F5 для запуска
echo.
pause
