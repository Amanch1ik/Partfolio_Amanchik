## Build stage: собираем production-бандл админ-панели
FROM node:20-alpine AS build

WORKDIR /app

# Копируем package.json админ-панели
COPY admin-panel/package*.json ./
RUN npm ci --legacy-peer-deps

# Копируем shared модули (из контекста panels-ts-v2)
# Копируем в оба места: ./shared (для vite) и ../shared (для tsconfig)
COPY shared ./shared
RUN mkdir -p .. && cp -r shared ../shared && \
    echo '{"compilerOptions":{"skipLibCheck":true,"noEmit":true},"exclude":["**/*"]}' > ../shared/tsconfig.json

# Копируем исходный код админ-панели (но не перезаписываем shared)
COPY admin-panel/src ./src
COPY admin-panel/public ./public
COPY admin-panel/index.html ./
COPY admin-panel/vite.config.ts ./
COPY admin-panel/tsconfig.json ./
COPY admin-panel/tsconfig.node.json ./

# Используем прод-режим билда (tsc + vite build)
RUN npm run build:prod

## Runtime stage: раздаём статику через nginx
FROM nginx:1.27-alpine

# Устанавливаем wget для health checks
RUN apk add --no-cache wget

# Удаляем дефолтный конфиг и кладём свой
RUN rm /etc/nginx/conf.d/default.conf
COPY admin-panel/nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный фронт из правильной папки
COPY --from=build /app/dist /usr/share/nginx/html

# Создаём директорию для логов
RUN mkdir -p /var/log/nginx

# Устанавливаем правильные права
RUN chown -R nginx:nginx /usr/share/nginx/html /var/log/nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
