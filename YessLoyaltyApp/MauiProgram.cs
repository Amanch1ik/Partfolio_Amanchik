using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using YessLoyaltyApp.ViewModels;
using YessLoyaltyApp.Views;
using YessLoyaltyApp.Services;
using YessLoyaltyApp.Converters;
using Plugin.FirebasePushNotification;

namespace YessLoyaltyApp;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // Конфигурация
        ConfigureConfiguration(builder);

        // Регистрация сервисов
        ConfigureServices(builder.Services);

        // Регистрация ViewModels
        ConfigureViewModels(builder.Services);

        // Регистрация Pages
        ConfigurePages(builder.Services);

        // Регистрация конвертеров
        ConfigureConverters(builder.Services);

        // Логирование
        ConfigureLogging(builder);

        // Инициализация App Center
        InitializeAppCenter(builder.Services);

        // Настройка Push-уведомлений
        ConfigurePushNotifications(builder);

        return builder.Build();
    }

    private static void ConfigureConfiguration(MauiAppBuilder builder)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        builder.Configuration.AddConfiguration(configuration);
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // HTTP-клиент
        services.AddHttpClient<ApiService>(client =>
        {
            client.BaseAddress = new Uri("https://api.yessloyalty.com/v1/");
            client.DefaultRequestHeaders.Accept.Clear();
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        // Базовые сервисы
        services.AddSingleton<INavigationService, NavigationService>();
        services.AddSingleton<ISecureStorageService, SecureStorageService>();
        
        // Кэширование
        services.AddMemoryCache();
        services.AddSingleton<ICacheService, MemoryCacheService>();

        // Мониторинг
        services.AddSingleton<IAppCenterService, AppCenterService>();
        services.AddSingleton<IMonitoringService, AppCenterMonitoringService>();

        // Offline-режим
        services.AddSingleton<IOfflineService, OfflineService>();

        // Сервисы обработки ошибок
        services.AddSingleton<ILoggingService, FileLoggingService>();
        services.AddSingleton<IErrorHandlingService, ErrorHandlingService>();
        services.AddSingleton<IEnvironmentService, EnvironmentService>();

        // API и аутентификация
        services.AddSingleton<ApiService>();
        services.AddSingleton<ExternalAuthService>();
        
        // Безопасность
        services.AddSingleton<IAdvancedSecurityService, AdvancedSecurityService>();
        services.AddSingleton<IBiometricService, BiometricService>();
    }

    private static void ConfigureViewModels(IServiceCollection services)
    {
        services.AddTransient<LoginViewModel>();
        services.AddTransient<RegisterViewModel>();
        services.AddTransient<PartnersViewModel>();
        
        // Добавляем ViewModel для уведомлений
        services.AddTransient<NotificationsViewModel>();
    }

    private static void ConfigurePages(IServiceCollection services)
    {
        services.AddTransient<LoginPage>();
        services.AddTransient<RegisterPage>();
        services.AddTransient<PartnersPage>();
        
        // Добавляем страницу уведомлений
        services.AddTransient<NotificationsPage>();
    }

    private static void ConfigureConverters(IServiceCollection services)
    {
        // Регистрация конвертеров
        services.AddTransient<ReadStatusColorConverter>();
        services.AddTransient<NotificationTypeColorConverter>();
        services.AddTransient<NotificationDateConverter>();
    }

    private static void ConfigureLogging(MauiAppBuilder builder)
    {
#if DEBUG
        builder.Logging.AddDebug();
#endif
        // Можно добавить другие провайдеры логирования
    }

    private static void InitializeAppCenter(IServiceCollection services)
    {
        // Получаем провайдер сервисов для асинхронной инициализации
        var serviceProvider = services.BuildServiceProvider();
        var appCenterService = serviceProvider.GetRequiredService<IAppCenterService>();
        
        // Асинхронная инициализация App Center
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            await appCenterService.InitializeAsync();
        });
    }

    private static void ConfigurePushNotifications(MauiAppBuilder builder)
    {
        // Регистрация сервиса push-уведомлений
        builder.Services.AddSingleton<IPushNotificationService, FirebasePushNotificationService>();

        // Настройка Firebase Push Notifications
        CrossFirebasePushNotification.Current.OnTokenRefresh += (s, p) =>
        {
            System.Diagnostics.Debug.WriteLine($"TOKEN : {p.Token}");
        };

        CrossFirebasePushNotification.Current.OnNotificationReceived += (s, p) =>
        {
            System.Diagnostics.Debug.WriteLine("Received");
        };

        CrossFirebasePushNotification.Current.OnNotificationOpened += (s, p) =>
        {
            System.Diagnostics.Debug.WriteLine("Opened");
            foreach (var data in p.Data)
            {
                System.Diagnostics.Debug.WriteLine($"{data.Key} : {data.Value}");
            }
        };

        // Инициализация при старте приложения
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            var pushService = builder.Services.BuildServiceProvider().GetRequiredService<IPushNotificationService>();
            await pushService.RegisterDeviceAsync();
        });
    }
}
