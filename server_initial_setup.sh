#!/bin/bash

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка базовых утилит
sudo apt install -y \
    git \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw

# Настройка Docker
sudo usermod -aG docker $USER
newgrp docker

# Настройка firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Усиление SSH
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Настройка fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Создание директории для проекта
sudo mkdir -p /opt/yess-loyalty
sudo chown $USER:$USER /opt/yess-loyalty

echo "Сервер подготовлен. Можно клонировать проект."
