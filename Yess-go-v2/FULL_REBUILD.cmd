@echo off
setlocal enabledelayedexpansion

echo ========================================
echo ПОЛНАЯ ПЕРЕСБОРКА ПРОЕКТА
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Полная очистка...
echo   Удаление папок obj и bin...
if exist "obj" (
    rmdir /s /q "obj" 2>nul
    echo   ✓ Папка obj удалена
)
if exist "bin" (
    rmdir /s /q "bin" 2>nul
    echo   ✓ Папка bin удалена
)
dotnet clean -f net9.0-android >nul 2>&1
echo   ✓ Очистка завершена
echo.

echo [2/5] Создание структуры папок assets...
if not exist "obj" mkdir "obj"
if not exist "obj\Debug" mkdir "obj\Debug"
if not exist "obj\Debug\net9.0-android" mkdir "obj\Debug\net9.0-android"
if not exist "obj\Debug\net9.0-android\assets" mkdir "obj\Debug\net9.0-android\assets"
if not exist "obj\Debug\net9.0-android\android" mkdir "obj\Debug\net9.0-android\android"
if not exist "obj\Debug\net9.0-android\android\assets" mkdir "obj\Debug\net9.0-android\android\assets"
echo   ✓ Структура папок создана
echo.

echo [3/5] Восстановление зависимостей...
dotnet restore -f net9.0-android
if errorlevel 1 (
    echo   ✗ ОШИБКА при восстановлении зависимостей
    echo.
    echo Подробности ошибки выше.
    pause
    exit /b 1
)
echo   ✓ Зависимости восстановлены
echo.

echo [4/5] Проверка папки assets после restore...
if not exist "obj\Debug\net9.0-android\assets" mkdir "obj\Debug\net9.0-android\assets"
if not exist "obj\Debug\net9.0-android\android\assets" mkdir "obj\Debug\net9.0-android\android\assets"
echo   ✓ Папка assets готова
echo.

echo [5/5] Сборка проекта для Android (arm64)...
echo   Выполняю: dotnet build -f net9.0-android -c Debug -r android-arm64
echo.
dotnet build -f net9.0-android -c Debug -r android-arm64
set BUILD_RESULT=%ERRORLEVEL%

if %BUILD_RESULT% NEQ 0 (
    echo.
    echo   ✗ ОШИБКА при сборке (код: %BUILD_RESULT%)
    echo.
    echo Попытка сборки с подробными логами...
    echo.
    dotnet build -f net9.0-android -c Debug -r android-arm64 -v detailed > build_log.txt 2>&1
    echo.
    echo Подробные логи сохранены в build_log.txt
    echo Проверьте файл build_log.txt для деталей ошибки.
    echo.
    type build_log.txt | findstr /C:"error" /C:"Error" /C:"ERROR" /C:"failed" /C:"Failed" /C:"assets" /C:"RuntimeIdentifier"
    echo.
    pause
    exit /b %BUILD_RESULT%
)

echo.
echo ========================================
echo ✓ СБОРКА ЗАВЕРШЕНА УСПЕШНО!
echo ========================================
echo.
echo Проект готов для запуска в Visual Studio!
echo.
pause
exit /b 0
