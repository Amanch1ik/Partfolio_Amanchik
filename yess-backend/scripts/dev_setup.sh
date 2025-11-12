#!/bin/bash

# Скрипт быстрой настройки разработки для YESS Loyalty Backend

set -e

# Цветной вывод
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка наличия необходимых утилит
check_dependencies() {
    echo -e "${GREEN}Проверка зависимостей...${NC}"
    command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Требуется Python 3${NC}"; exit 1; }
    command -v pip >/dev/null 2>&1 || { echo -e "${RED}Требуется pip${NC}"; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}Рекомендуется установить Docker${NC}"; }
}

# Создание виртуального окружения
create_venv() {
    echo -e "${GREEN}Создание виртуального окружения...${NC}"
    python3 -m venv venv
    source venv/bin/activate
}

# Установка зависимостей
install_dependencies() {
    echo -e "${GREEN}Установка зависимостей...${NC}"
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
}

# Настройка базы данных
setup_database() {
    echo -e "${GREEN}Настройка базы данных...${NC}"
    alembic upgrade head
}

# Запуск тестов
run_tests() {
    echo -e "${GREEN}Запуск тестов...${NC}"
    pytest tests/ --cov=app
}

# Старт разработческого сервера
start_dev_server() {
    echo -e "${GREEN}Запуск dev-сервера...${NC}"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

# Основной процесс
main() {
    check_dependencies
    create_venv
    install_dependencies
    setup_database
    run_tests
    start_dev_server
}

# Выполнение
main
