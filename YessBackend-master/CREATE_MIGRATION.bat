@echo off
setlocal enabledelayedexpansion
echo ========================================
echo Создание EF Core миграции
echo ========================================
echo.

cd /d "%~dp0"

echo Проверка запущенных процессов backend...
echo.

REM Простой способ - ищем процессы dotnet и проверяем их командную строку
set FOUND=0
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq dotnet.exe" /FO LIST 2^>nul ^| findstr /I "PID"') do (
    set PID=%%a
    set PID=!PID: =!
    if not "!PID!"=="" (
        for /f "delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine /format:list 2^>nul ^| findstr "CommandLine"') do (
            set CMDLINE=%%b
            set CMDLINE=!CMDLINE:CommandLine=!
            echo !CMDLINE! | findstr /I "YessBackend.Api" >nul
            if !ERRORLEVEL! EQU 0 (
                echo Обнаружен процесс backend с PID: !PID!
                echo Остановка процесса...
                taskkill /PID !PID! /F >nul 2>&1
                if !ERRORLEVEL! EQU 0 (
                    echo Процесс !PID! успешно остановлен.
                    set FOUND=1
                )
            )
        )
    )
)

if !FOUND! EQU 1 (
    echo.
    echo Ожидание освобождения файлов...
    timeout /t 3 /nobreak >nul
    echo.
)

echo Проверка .NET SDK...
dotnet --version
if %ERRORLEVEL% NEQ 0 (
    echo ОШИБКА: .NET SDK не найден!
    pause
    exit /b 1
)

echo.
echo Создание миграции InitialCreate...
cd YessBackend.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ..\YessBackend.Api --context ApplicationDbContext

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Миграция успешно создана!
    echo ========================================
    echo.
    echo Миграция будет автоматически применена при следующем запуске backend.
    echo Или примените вручную командой:
    echo   dotnet ef database update --startup-project ..\YessBackend.Api
    echo.
) else (
    echo.
    echo ========================================
    echo ОШИБКА при создании миграции!
    echo ========================================
    echo.
    echo Возможные причины:
    echo 1. Backend все еще запущен - используйте STOP_BACKEND.bat
    echo 2. Ошибки в коде - проверьте вывод выше
    echo.
)

pause
