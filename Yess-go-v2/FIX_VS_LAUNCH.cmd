@echo off
echo ========================================
echo Исправление настроек для Visual Studio
echo ========================================
echo.

cd /d "%~dp0"

echo Удаление файла настроек Visual Studio (будет пересоздан автоматически)...
if exist "YessGoFront.csproj.user" (
    del "YessGoFront.csproj.user"
    echo ✓ Файл YessGoFront.csproj.user удален
    echo.
    echo Visual Studio создаст новый файл автоматически при следующем открытии проекта
    echo с правильными настройками RuntimeIdentifier на основе выбранного эмулятора.
) else (
    echo Файл YessGoFront.csproj.user не найден - уже удален или не существует
)

echo.
echo ========================================
echo ✓ Готово!
echo ========================================
echo.
echo Теперь в Visual Studio:
echo   1. Закройте проект (если открыт)
echo   2. Откройте проект снова (YessGoFront.sln)
echo   3. Выберите Android эмулятор в панели инструментов
echo   4. Visual Studio автоматически выберет правильный RuntimeIdentifier
echo   5. Нажмите F5 для запуска
echo.
pause
