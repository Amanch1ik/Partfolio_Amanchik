# Используем официальный образ .NET 10 SDK для сборки
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Копируем файлы проекта
COPY ["YessBackend.Api/YessBackend.Api.csproj", "YessBackend.Api/"]
COPY ["YessBackend.Application/YessBackend.Application.csproj", "YessBackend.Application/"]
COPY ["YessBackend.Domain/YessBackend.Domain.csproj", "YessBackend.Domain/"]
COPY ["YessBackend.Infrastructure/YessBackend.Infrastructure.csproj", "YessBackend.Infrastructure/"]

# Восстанавливаем зависимости
RUN dotnet restore "YessBackend.Api/YessBackend.Api.csproj"

# Копируем весь код
COPY . .

# Собираем проект
WORKDIR "/src/YessBackend.Api"
RUN dotnet build "YessBackend.Api.csproj" -c Release -o /app/build

# Публикуем проект
RUN dotnet publish "YessBackend.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Используем runtime образ для production
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Устанавливаем необходимые пакеты для работы с PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем опубликованное приложение
COPY --from=build /app/publish .

# Создаем папку для загрузок
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Открываем порты (HTTP и HTTPS)
EXPOSE 8000
EXPOSE 8443

# Устанавливаем переменные окружения (только HTTP, HTTPS только если есть сертификат)
ENV ASPNETCORE_URLS=http://+:8000
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTPS_PORT=8443

# Запускаем приложение
ENTRYPOINT ["dotnet", "YessBackend.Api.dll"]
