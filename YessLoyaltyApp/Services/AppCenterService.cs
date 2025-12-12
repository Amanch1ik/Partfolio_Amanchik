using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AppCenter;
using Microsoft.AppCenter.Analytics;
using Microsoft.AppCenter.Crashes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace YessLoyaltyApp.Services
{
    public interface IAppCenterService
    {
        Task InitializeAsync();
        void TrackEvent(string eventName, Dictionary<string, string> properties = null);
        void TrackError(Exception exception, Dictionary<string, string> properties = null);
        void SetUserId(string userId);
        void EnableAnalytics(bool enable);
        void EnableCrashReporting(bool enable);
    }

    public class AppCenterService : IAppCenterService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AppCenterService> _logger;
        private readonly ISecureStorageService _secureStorage;

        public AppCenterService(
            IConfiguration configuration, 
            ILogger<AppCenterService> logger,
            ISecureStorageService secureStorage)
        {
            _configuration = configuration;
            _logger = logger;
            _secureStorage = secureStorage;
        }

        public async Task InitializeAsync()
        {
            try 
            {
                // Получаем App Center секреты из конфигурации
                var androidSecret = _configuration["AppCenter:AndroidSecret"];
                var iOSSecret = _configuration["AppCenter:IOSSecret"];
                var windowsSecret = _configuration["AppCenter:WindowSSecret"];

                // Инициализация App Center
                AppCenter.Start(
                    $"android={androidSecret};" +
                    $"ios={iOSSecret};" +
                    $"windows={windowsSecret}",
                    typeof(Analytics), 
                    typeof(Crashes)
                );

                // Настройка отправки анонимных данных
                var userId = await GetOrCreateUserIdAsync();
                SetUserId(userId);

                _logger.LogInformation("App Center initialized successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError($"App Center initialization error: {ex.Message}");
            }
        }

        public void TrackEvent(string eventName, Dictionary<string, string> properties = null)
        {
            try 
            {
                Analytics.TrackEvent(eventName, properties);
                _logger.LogInformation($"Event tracked: {eventName}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error tracking event {eventName}: {ex.Message}");
            }
        }

        public void TrackError(Exception exception, Dictionary<string, string> properties = null)
        {
            try 
            {
                // Отправка crashes и логирование
                Crashes.TrackError(exception, properties);
                _logger.LogError($"Error tracked: {exception.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error tracking exception: {ex.Message}");
            }
        }

        public void SetUserId(string userId)
        {
            try 
            {
                AppCenter.SetUserId(userId);
                _logger.LogInformation($"User ID set: {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error setting user ID: {ex.Message}");
            }
        }

        public void EnableAnalytics(bool enable)
        {
            Analytics.SetEnabledAsync(enable);
            _logger.LogInformation($"Analytics {(enable ? "enabled" : "disabled")}");
        }

        public void EnableCrashReporting(bool enable)
        {
            Crashes.SetEnabledAsync(enable);
            _logger.LogInformation($"Crash reporting {(enable ? "enabled" : "disabled")}");
        }

        private async Task<string> GetOrCreateUserIdAsync()
        {
            const string USER_ID_KEY = "app_center_user_id";

            // Пытаемся получить существующий ID
            var existingUserId = await _secureStorage.GetAsync(USER_ID_KEY);
            
            if (!string.IsNullOrEmpty(existingUserId))
            {
                return existingUserId;
            }

            // Создаем новый уникальный ID
            var newUserId = Guid.NewGuid().ToString();
            await _secureStorage.SetAsync(USER_ID_KEY, newUserId);

            return newUserId;
        }
    }

    // Расширение для удобного логирования производительности
    public static class PerformanceTrackingExtensions
    {
        public static async Task<T> TrackPerformanceAsync<T>(
            this IAppCenterService appCenterService, 
            string operationName, 
            Func<Task<T>> operation)
        {
            var startTime = DateTime.UtcNow;

            try 
            {
                var result = await operation();
                
                var duration = DateTime.UtcNow - startTime;
                
                appCenterService.TrackEvent("OperationPerformance", new Dictionary<string, string>
                {
                    ["OperationName"] = operationName,
                    ["DurationMs"] = duration.TotalMilliseconds.ToString()
                });

                return result;
            }
            catch (Exception ex)
            {
                appCenterService.TrackError(ex, new Dictionary<string, string>
                {
                    ["OperationName"] = operationName
                });
                throw;
            }
        }
    }
}
