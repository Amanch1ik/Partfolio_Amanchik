param(
    [switch]$Force = $false
)

# Цветной вывод
function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$Color = 'White'
    )
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = 'White'
}

# Список папок и файлов для удаления
$itemsToRemove = @(
    # Старые frontend файлы
    "frontend/.expo",
    "frontend/.eslintignore",
    "frontend/.eslintrc.cjs",
    "frontend/.prettierignore",
    "frontend/.prettierrc",
    "frontend/Dockerfile",
    "frontend/app.json",
    "frontend/babel.config.js",
    "frontend/index.html",
    "frontend/nginx.conf",
    "frontend/package-lock.json",
    "frontend/tsconfig.json",
    "frontend/tsconfig.node.json",
    "frontend/vite.config.ts",

    # Служебные файлы
    ".DS_Store",
    "Thumbs.db",
    ".idea",
    ".vscode",

    # Кэш и логи
    "**/node_modules",
    "**/__pycache__",
    "**/*.pyc",
    "**/*.log",

    # Старые бэкенд файлы
    "yess-backend/yess_loyalty_system.egg-info"
)

# Функция для безопасного удаления
function Remove-ItemSafely {
    param(
        [string]$Path,
        [switch]$Force
    )

    if (Test-Path $Path) {
        try {
            if ($Force) {
                Remove-Item -Path $Path -Recurse -Force
                Write-ColorOutput "✅ Удалено: $Path" Green
            }
            else {
                Remove-Item -Path $Path -Recurse -Confirm
                Write-ColorOutput "✅ Удалено после подтверждения: $Path" Yellow
            }
        }
        catch {
            Write-ColorOutput "❌ Ошибка при удалении $Path" Red
        }
    }
}

# Основная функция очистки
function Start-Cleanup {
    Write-ColorOutput "🧹 Начало очистки проекта..." Cyan

    foreach ($item in $itemsToRemove) {
        $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $item
        Remove-ItemSafely -Path $fullPath -Force:$Force
    }

    Write-ColorOutput "`n🌟 Очистка завершена!" Green
}

# Запуск очистки
Start-Cleanup
