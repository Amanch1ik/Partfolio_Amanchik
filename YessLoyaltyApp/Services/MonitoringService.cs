using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace YessLoyaltyApp.Services
{
    public interface IMonitoringService
    {
        void TrackEvent(string eventName, Dictionary<string, string> properties = null);
        void TrackException(Exception exception, bool isFatal = false);
        void TrackPerformance(string operationName, TimeSpan duration);
        void SetUserIdentifier(string userId);
    }

    public class AppCenterMonitoringService : IMonitoringService
    {
        private readonly ILogger<AppCenterMonitoringService> _logger;

        public AppCenterMonitoringService(ILogger<AppCenterMonitoringService> logger)
        {
            _logger = logger;
            InitializeAppCenter();
        }

        private void InitializeAppCenter()
        {
            try 
            {
                // Инициализация App Center
                // Microsoft.AppCenter.AppCenter.Start(
                //     "{Your App Secret}", 
                //     typeof(Analytics), 
                //     typeof(Crashes)
                // );
            }
            catch (Exception ex)
            {
                _logger.LogError($"AppCenter initialization error: {ex.Message}");
            }
        }

        public void TrackEvent(string eventName, Dictionary<string, string> properties = null)
        {
            try 
            {
                // Microsoft.AppCenter.Analytics.Analytics.TrackEvent(eventName, properties);
                _logger.LogInformation($"Event tracked: {eventName}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error tracking event {eventName}: {ex.Message}");
            }
        }

        public void TrackException(Exception exception, bool isFatal = false)
        {
            try 
            {
                // Если fatal - завершаем приложение
                if (isFatal)
                {
                    // Microsoft.AppCenter.Crashes.Crashes.TrackError(exception);
                    Environment.FailFast("Fatal error", exception);
                }
                else 
                {
                    // Microsoft.AppCenter.Crashes.Crashes.TrackError(exception);
                    _logger.LogError($"Exception tracked: {exception.Message}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error tracking exception: {ex.Message}");
            }
        }

        public void TrackPerformance(string operationName, TimeSpan duration)
        {
            try 
            {
                var properties = new Dictionary<string, string>
                {
                    ["Duration"] = duration.TotalMilliseconds.ToString()
                };

                TrackEvent($"Performance_{operationName}", properties);
                _logger.LogInformation($"Performance tracked: {operationName} - {duration.TotalMilliseconds}ms");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error tracking performance: {ex.Message}");
            }
        }

        public void SetUserIdentifier(string userId)
        {
            try 
            {
                // Microsoft.AppCenter.AppCenter.SetUserId(userId);
                _logger.LogInformation($"User identifier set: {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error setting user identifier: {ex.Message}");
            }
        }
    }

    // Расширения для удобного мониторинга производительности
    public static class PerformanceMonitorExtensions
    {
        public static async Task<T> MonitorAsync<T>(
            this IMonitoringService monitoringService, 
            string operationName, 
            Func<Task<T>> operation)
        {
            var stopwatch = Stopwatch.StartNew();
            
            try 
            {
                var result = await operation();
                stopwatch.Stop();
                
                monitoringService.TrackPerformance(operationName, stopwatch.Elapsed);
                
                return result;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                monitoringService.TrackException(ex);
                throw;
            }
        }
    }
}
