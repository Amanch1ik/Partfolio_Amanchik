#!/bin/bash

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose не установлен. Пожалуйста, установите Docker Compose."
    exit 1
fi

# Функция для проверки статуса служб
check_services() {
    docker-compose ps
}

# Функция для просмотра логов
view_logs() {
    docker-compose logs -f $1
}

# Основное меню
while true; do
    clear
    echo "===== Yess Loyalty Dev Environment ====="
    echo "1. Запустить все сервисы"
    echo "2. Остановить все сервисы"
    echo "3. Перезапустить сервисы"
    echo "4. Посмотреть статус служб"
    echo "5. Посмотреть логи Backend"
    echo "6. Посмотреть логи Frontend"
    echo "7. Выйти"
    read -p "Выберите действие (1-7): " choice

    case $choice in
        1)
            docker-compose up -d
            echo "Сервисы запущены. Откройте http://localhost:3000 для фронтенда и http://localhost:8000/docs для бэкенда"
            ;;
        2)
            docker-compose down
            ;;
        3)
            docker-compose down
            docker-compose up -d
            ;;
        4)
            check_services
            ;;
        5)
            view_logs backend
            ;;
        6)
            view_logs frontend
            ;;
        7)
            exit 0
            ;;
        *)
            echo "Неверный выбор. Попробуйте снова."
            ;;
    esac

    read -p "Нажмите Enter для продолжения..." pause
done
