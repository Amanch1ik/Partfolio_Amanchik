# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --legacy-peer-deps

# Копируем исходный код
COPY . .

# Сборка для production
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаём скрипт для замены переменных окружения
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    echo 'envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp && mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html' >> /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

