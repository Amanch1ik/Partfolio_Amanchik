@echo off
echo Копирование C# backend в E:\YessProject - копия\yess-backend-dotnet
echo.

set SOURCE_DIR=%~dp0
set DEST_DIR=E:\YessProject - копия\yess-backend-dotnet

if exist "%DEST_DIR%" (
    echo Удаление существующей директории...
    rmdir /s /q "%DEST_DIR%"
)

echo Создание новой директории...
mkdir "%DEST_DIR%"

echo Копирование файлов...
xcopy /E /I /Y /EXCLUDE:exclude.txt "%SOURCE_DIR%*" "%DEST_DIR%"

echo.
echo Копирование завершено!
echo Проект находится в: %DEST_DIR%
pause
