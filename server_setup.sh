#!/bin/bash

# Скрипт первоначальной настройки сервера для Yess Loyalty App

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых утилит
sudo apt install -y git docker.io docker-compose nginx certbot python3-certbot-nginx

# Создание пользователя для деплоя
sudo useradd -m deployer
sudo usermod -aG docker deployer

# Настройка SSH
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Базовые настройки firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Создание директории для проекта
sudo mkdir -p /opt/yess-loyalty
sudo chown deployer:deployer /opt/yess-loyalty

echo "Сервер подготовлен. Далее следуйте инструкциям по деплою."
