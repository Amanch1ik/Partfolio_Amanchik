using System;
using System.IO;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Maui;
using Microsoft.Maui.Controls.Hosting;
using Microsoft.Maui.Hosting;
using Microsoft.Maui.Storage;
using SkiaSharp.Views.Maui.Controls.Hosting;
using YessGoFront.Config;
using YessGoFront.Data;
using YessGoFront.Infrastructure.Auth;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Infrastructure.Http.HttpMessageHandlers;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;
using ZXing.Net.Maui.Controls;
using Microsoft.Maui.Handlers;
#if ANDROID
using YessGoFront.Platforms.Android.Handlers;
#endif

namespace YessGoFront;

public static class MauiProgram
{
    public static IServiceProvider Services { get; private set; } = null!;

    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        builder
            .UseMauiApp<App>()
            .UseSkiaSharp(true)
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            })
            .UseBarcodeReader();

        // -----------------------------------------------
        // ✅ Регистрируем наш Emoji-safe Entry handler
        // Использует Android.Widget.EditText вместо AppCompatEditText
        // Это полностью избегает EmojiCompat, который активируется только для AppCompatEditText
        // -----------------------------------------------
        builder.ConfigureMauiHandlers(handlers =>
        {
#if ANDROID
            handlers.AddHandler<Entry, NoEmojiEntryHandler>();
#endif
        });

        // -----------------------------------------------
        // Твой код конфигурации — оставлен как есть
        // -----------------------------------------------
        ConfigureSettings(builder.Services);
        ConfigureDatabase(builder.Services);
        ConfigureHttpClients(builder.Services);
        ConfigureServices(builder.Services);
        ConfigureViewModels(builder.Services);
        ConfigureLogging(builder);

        var app = builder.Build();
        Services = app.Services;

        // Инициализируем базу данных при запуске приложения
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = Services.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var logger = scope.ServiceProvider.GetService<ILogger<DatabaseInitializer>>();
                var initializer = new DatabaseInitializer(dbContext, logger);
                
                System.Diagnostics.Debug.WriteLine("[MauiProgram] Initializing database...");
                await initializer.InitializeAsync();
                System.Diagnostics.Debug.WriteLine("[MauiProgram] Database initialized successfully");
                
                // Заполняем базу данных начальными данными
                System.Diagnostics.Debug.WriteLine("[MauiProgram] Seeding database...");
                await initializer.SeedAsync();
                System.Diagnostics.Debug.WriteLine("[MauiProgram] Database seeded successfully");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MauiProgram] ❌ Failed to initialize database: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[MauiProgram] StackTrace: {ex.StackTrace}");
            }
        });

        // Запускаем сервис периодического обновления баланса
        try
        {
            var balanceRefreshService = Services.GetService<YessGoFront.Services.BalanceRefreshService>();
            if (balanceRefreshService != null)
            {
                // Обновляем баланс каждые 30 секунд
                balanceRefreshService.Start(TimeSpan.FromSeconds(30));
                System.Diagnostics.Debug.WriteLine("[MauiProgram] Balance refresh service started");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[MauiProgram] Failed to start balance refresh service: {ex.Message}");
        }

        // Тест API
        _ = Task.Run(async () =>
        {
            try
            {
                var settings = Services.GetRequiredService<AppSettings>();
                System.Diagnostics.Debug.WriteLine($"[AppSettings] BaseUrl = {settings.Api.BaseUrl}");

                var clientFactory = Services.GetRequiredService<IHttpClientFactory>();
                var client = clientFactory.CreateClient("ApiClient");

                var response = await client.GetAsync("api/v1/health");
                var text = await response.Content.ReadAsStringAsync();

                System.Diagnostics.Debug.WriteLine($"[HEALTH TEST] ✅ {response.StatusCode}: {text}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[HEALTH TEST] ❌ ERROR: {ex.Message}");
            }
        });

        return app;
    }

    private static string GetDatabaseConnectionString()
    {
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING");
        if (!string.IsNullOrEmpty(connectionString))
            return connectionString;

        var dbPath = Path.Combine(FileSystem.AppDataDirectory, "yessgo.db");
        // Включаем поддержку внешних ключей в SQLite
        return $"Data Source={dbPath};Foreign Keys=True";
    }

    private static string GetDefaultApiBaseUrl()
    {
        // Сначала проверяем переменную окружения
        var envUrl = Environment.GetEnvironmentVariable("API_BASE_URL");
        if (!string.IsNullOrEmpty(envUrl))
        {
            System.Diagnostics.Debug.WriteLine($"[MauiProgram] Using API_BASE_URL from environment: {envUrl}");
            return envUrl.TrimEnd('/') + "/";
        }

        // Используем значение из ApiConfiguration (там уже правильный IP сервера)
        var defaultUrl = ApiConfiguration.GetBaseUrlWithTrailingSlash();
        System.Diagnostics.Debug.WriteLine($"[MauiProgram] Using default API URL from ApiConfiguration: {defaultUrl}");
        
#if ANDROID
        // Для эмулятора можно использовать 10.0.2.2, но только если сервер запущен на localhost
        // По умолчанию используем реальный IP сервера из ApiConfiguration
        try
        {
            var fingerprint = Android.OS.Build.Fingerprint ?? "";
            var model = Android.OS.Build.Model ?? "";
            var isEmulator =
                fingerprint.Contains("generic", StringComparison.OrdinalIgnoreCase) ||
                fingerprint.Contains("emulator", StringComparison.OrdinalIgnoreCase) ||
                fingerprint.Contains("sdk", StringComparison.OrdinalIgnoreCase) ||
                model.Contains("Emulator", StringComparison.OrdinalIgnoreCase) ||
                model.Contains("sdk", StringComparison.OrdinalIgnoreCase);

            if (isEmulator)
            {
                System.Diagnostics.Debug.WriteLine($"[MauiProgram] Detected EMULATOR, but using server URL: {defaultUrl}");
                System.Diagnostics.Debug.WriteLine($"[MauiProgram] If server is on localhost, set API_BASE_URL=http://10.0.2.2:8000/");
            }
        }
        catch { }
#endif

        return defaultUrl;
    }

    private static void ConfigureSettings(IServiceCollection services)
    {
        var apiBaseUrl = Environment.GetEnvironmentVariable("API_BASE_URL")
            ?? GetDefaultApiBaseUrl();

        var dbConnectionString = GetDatabaseConnectionString();

        services.AddSingleton<AppSettings>(_ => new AppSettings
        {
            Api = new ApiSettings
            {
                BaseUrl = apiBaseUrl,
                ApiVersion = "v1",
                RequestTimeoutSeconds = 30
            },
            Timeouts = new TimeoutSettings
            {
                RequestTimeout = 30,
                RetryAttempts = 3,
                RetryDelayMs = 1000
            },
            Database = new DatabaseSettings
            {
                ConnectionString = dbConnectionString,
                EnableSqlLogging = false
            }
        });
    }

    private static void ConfigureDatabase(IServiceCollection services)
    {
        services.AddSingleton<IDatabaseConnectionService, DatabaseConnectionService>();

        services.AddScoped<AppDbContext>(serviceProvider =>
        {
            var connectionService = serviceProvider.GetRequiredService<IDatabaseConnectionService>();
            var logger = serviceProvider.GetService<ILogger<AppDbContext>>();
            var connectionString = connectionService.GetConnectionString();
            var enableSqlLogging = connectionService.IsSqlLoggingEnabled();

            return new AppDbContext(connectionString, enableSqlLogging, logger);
        });
    }

    private static void ConfigureHttpClients(IServiceCollection services)
    {
        services.AddTransient<AuthHandler>();
        services.AddTransient<LoggingHandler>();

        services.AddHttpClient("ApiClient", (sp, client) =>
        {
            var settings = sp.GetRequiredService<AppSettings>();
            client.BaseAddress = new Uri(settings.Api.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(settings.Api.RequestTimeoutSeconds);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        })
        .AddHttpMessageHandler<AuthHandler>()
        .AddHttpMessageHandler<LoggingHandler>();

        // Отдельный HttpClient для refresh token запросов (без AuthHandler, чтобы избежать бесконечного цикла)
        services.AddHttpClient("RefreshTokenClient", (sp, client) =>
        {
            var settings = sp.GetRequiredService<AppSettings>();
            client.BaseAddress = new Uri(settings.Api.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(settings.Api.RequestTimeoutSeconds);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        })
        .AddHttpMessageHandler<LoggingHandler>(); // Только LoggingHandler, без AuthHandler

        services.AddHttpClient<IAuthApiService, AuthApiService>("ApiClient");
        services.AddHttpClient<IPartnersApiService, PartnersApiService>("ApiClient");
        services.AddHttpClient<IWalletApiService, WalletApiService>("ApiClient");
        services.AddHttpClient<IQRApiService, QRApiService>("ApiClient");
        services.AddHttpClient<IBannerApiService, BannerApiService>("ApiClient");
        services.AddHttpClient<IPromoCodeApiService, PromoCodeApiService>("ApiClient");
        services.AddHttpClient<INotificationApiService, NotificationApiService>("ApiClient");
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton<IAuthenticationService, AuthenticationService>();
        services.AddSingleton<YessGoFront.Services.ILocationService, YessGoFront.Services.LocationService>();
        services.AddSingleton<YessGoFront.Services.IImageCacheService, YessGoFront.Services.ImageCacheService>();
        services.AddSingleton<YessGoFront.Services.BalanceRefreshService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPartnersService, PartnersService>();
        services.AddScoped<IWalletService, WalletService>();
        services.AddScoped<IQRService, QRService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IPromoCodeService, PromoCodeService>();
    }

    private static void ConfigureViewModels(IServiceCollection services)
    {
        // Register viewmodels here
        services.AddTransient<ViewModels.TransactionsViewModel>();
        services.AddTransient<ViewModels.TransactionDetailsViewModel>();
        services.AddTransient<ViewModels.NotificationsViewModel>();
        services.AddTransient<ViewModels.PromocodeViewModel>();
    }

    private static void ConfigureLogging(MauiAppBuilder builder)
    {
#if DEBUG
        builder.Services.AddLogging(logging => logging.AddDebug());
#endif
    }
}
