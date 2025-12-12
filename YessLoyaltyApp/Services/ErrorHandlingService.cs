using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace YessLoyaltyApp.Services
{
    public enum ErrorSeverity
    {
        Low,
        Medium,
        High,
        Critical
    }

    public class AppError
    {
        public string Message { get; set; }
        public string Details { get; set; }
        public ErrorSeverity Severity { get; set; }
        public DateTime Timestamp { get; set; }
        public string StackTrace { get; set; }
    }

    public interface IErrorHandlingService
    {
        void LogError(Exception ex, ErrorSeverity severity = ErrorSeverity.Medium);
        void LogError(string message, ErrorSeverity severity = ErrorSeverity.Medium);
        Task DisplayErrorAsync(string message, string title = "Ошибка");
        Task<bool> HandleApiErrorAsync(ApiResponse response);
    }

    public class ErrorHandlingService : IErrorHandlingService
    {
        private readonly ILoggingService _loggingService;

        public ErrorHandlingService(ILoggingService loggingService)
        {
            _loggingService = loggingService;
        }

        public void LogError(Exception ex, ErrorSeverity severity = ErrorSeverity.Medium)
        {
            var appError = new AppError
            {
                Message = ex.Message,
                Details = ex.ToString(),
                Severity = severity,
                Timestamp = DateTime.UtcNow,
                StackTrace = ex.StackTrace
            };

            // Логирование в файл
            _loggingService.LogToFile(appError);

            // Отправка на сервер мониторинга (если настроен)
            if (severity >= ErrorSeverity.High)
            {
                SendErrorToMonitoringService(appError);
            }

            // Отладочная информация
            Debug.WriteLine($"[{severity}] {ex.Message}");
        }

        public void LogError(string message, ErrorSeverity severity = ErrorSeverity.Medium)
        {
            var appError = new AppError
            {
                Message = message,
                Severity = severity,
                Timestamp = DateTime.UtcNow
            };

            _loggingService.LogToFile(appError);
            Debug.WriteLine($"[{severity}] {message}");
        }

        public async Task DisplayErrorAsync(string message, string title = "Ошибка")
        {
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await Shell.Current.DisplayAlert(title, message, "OK");
            });
        }

        public async Task<bool> HandleApiErrorAsync(ApiResponse response)
        {
            if (!response.IsSuccess)
            {
                // Классификация ошибок
                var severity = DetermineErrorSeverity(response.ErrorMessage);
                
                LogError(response.ErrorMessage, severity);
                
                await DisplayErrorAsync(GetUserFriendlyMessage(response.ErrorMessage));
                
                return false;
            }
            
            return true;
        }

        private ErrorSeverity DetermineErrorSeverity(string errorMessage)
        {
            // Логика определения серьезности ошибки
            if (errorMessage.Contains("unauthorized", StringComparison.OrdinalIgnoreCase))
                return ErrorSeverity.High;
            
            if (errorMessage.Contains("network", StringComparison.OrdinalIgnoreCase))
                return ErrorSeverity.Medium;
            
            return ErrorSeverity.Low;
        }

        private string GetUserFriendlyMessage(string errorMessage)
        {
            // Преобразование технических сообщений в понятные пользователю
            return errorMessage switch
            {
                string msg when msg.Contains("unauthorized") => 
                    "Не удалось войти. Проверьте логин и пароль.",
                string msg when msg.Contains("network") => 
                    "Проблема с интернет-соединением. Проверьте подключение.",
                _ => "Произошла неизвестная ошибка. Попробуйте позже."
            };
        }

        private void SendErrorToMonitoringService(AppError error)
        {
            // Заглушка для отправки критических ошибок 
            // в систему мониторинга (например, Sentry, AppCenter)
            try 
            {
                // Реальная интеграция будет зависеть от выбранного сервиса
                // var client = new SentryClient(DSN);
                // client.CaptureException(error);
            }
            catch 
            {
                // Обработка ошибок отправки
                Debug.WriteLine("Не удалось отправить ошибку в мониторинг");
            }
        }
    }

    public interface ILoggingService
    {
        void LogToFile(AppError error);
    }

    public class FileLoggingService : ILoggingService
    {
        private readonly string _logFilePath;

        public FileLoggingService()
        {
            _logFilePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                "YessLoyalty", 
                "logs",
                $"app_log_{DateTime.Now:yyyyMMdd}.txt"
            );

            // Создание директории для логов
            Directory.CreateDirectory(Path.GetDirectoryName(_logFilePath));
        }

        public void LogToFile(AppError error)
        {
            try 
            {
                var logEntry = $"[{error.Timestamp}] [{error.Severity}] {error.Message}\n" +
                               $"Details: {error.Details}\n" +
                               $"StackTrace: {error.StackTrace}\n" +
                               "---\n";

                File.AppendAllText(_logFilePath, logEntry);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Ошибка логирования: {ex.Message}");
            }
        }
    }
}
