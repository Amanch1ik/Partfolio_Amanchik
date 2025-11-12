using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Plugin.FirebasePushNotification;
using System.Collections.Generic; // Added for IDictionary
using Microsoft.Maui.Controls; // Added for MainThread
using Microsoft.Maui.Devices; // Added for DeviceInfo
using Microsoft.Maui.Storage; // Added for SecureStorage

namespace YessLoyaltyApp.Services
{
    public enum NotificationType
    {
        Promotion,
        Transaction,
        Bonus,
        Security,
        System
    }

    public class PushNotificationPayload
    {
        public string Title { get; set; }
        public string Body { get; set; }
        public NotificationType Type { get; set; }
        public string Data { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public interface IPushNotificationService
    {
        Task RegisterDeviceAsync();
        Task UnregisterDeviceAsync();
        void HandleReceivedNotification(PushNotificationPayload payload);
        event EventHandler<PushNotificationPayload> NotificationReceived;
    }

    public class FirebasePushNotificationService : IPushNotificationService
    {
        private readonly ILogger<FirebasePushNotificationService> _logger;
        private readonly IApiService _apiService;
        private readonly ISecureStorageService _secureStorage;

        public event EventHandler<PushNotificationPayload> NotificationReceived;

        private const string DEVICE_TOKEN_KEY = "push_notification_token";

        public FirebasePushNotificationService(
            ILogger<FirebasePushNotificationService> logger,
            IApiService apiService,
            ISecureStorageService secureStorage)
        {
            _logger = logger;
            _apiService = apiService;
            _secureStorage = secureStorage;

            // Подписка на события Firebase
            CrossFirebasePushNotification.Current.OnTokenRefresh += (s, p) => 
            {
                SaveDeviceToken(p.Token);
            };

            CrossFirebasePushNotification.Current.OnNotificationReceived += (s, p) => 
            {
                HandleIncomingNotification(p.Data);
            };

            CrossFirebasePushNotification.Current.OnNotificationOpened += (s, p) => 
            {
                HandleNotificationTap(p.Data);
            };
        }

        public async Task RegisterDeviceAsync()
        {
            try 
            {
                // Получаем токен устройства
                var token = CrossFirebasePushNotification.Current.Token;
                
                if (string.IsNullOrEmpty(token))
                {
                    // Принудительный запрос токена
                    await CrossFirebasePushNotification.Current.RequestPermissionAsync();
                    token = CrossFirebasePushNotification.Current.Token;
                }

                // Сохраняем токен
                await SaveDeviceToken(token);

                // Отправляем токен на бэкенд
                await RegisterTokenWithBackendAsync(token);

                _logger.LogInformation($"Push notification token registered: {token}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error registering push notification: {ex.Message}");
            }
        }

        public async Task UnregisterDeviceAsync()
        {
            try 
            {
                var token = await _secureStorage.GetAsync(DEVICE_TOKEN_KEY);
                
                if (!string.IsNullOrEmpty(token))
                {
                    // Отправляем запрос на бэкенд об отключении
                    await _apiService.UnregisterPushTokenAsync(token);
                    
                    // Удаляем локальный токен
                    await _secureStorage.RemoveAsync(DEVICE_TOKEN_KEY);
                }

                _logger.LogInformation("Push notification token unregistered");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error unregistering push notification: {ex.Message}");
            }
        }

        private async Task SaveDeviceToken(string token)
        {
            await _secureStorage.SetAsync(DEVICE_TOKEN_KEY, token);
        }

        private async Task RegisterTokenWithBackendAsync(string token)
        {
            try 
            {
                var deviceInfo = new 
                {
                    token,
                    platform = DeviceInfo.Platform.ToString(),
                    model = DeviceInfo.Model,
                    manufacturer = DeviceInfo.Manufacturer
                };

                await _apiService.RegisterPushTokenAsync(deviceInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error registering token with backend: {ex.Message}");
            }
        }

        private void HandleIncomingNotification(IDictionary<string, object> data)
        {
            try 
            {
                var payload = ParseNotificationPayload(data);
                
                // Локальное уведомление
                ShowLocalNotification(payload);

                // Событие для подписчиков
                NotificationReceived?.Invoke(this, payload);

                _logger.LogInformation($"Notification received: {payload.Title}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error handling notification: {ex.Message}");
            }
        }

        private void HandleNotificationTap(IDictionary<string, object> data)
        {
            try 
            {
                var payload = ParseNotificationPayload(data);
                
                // Логика обработки нажатия на уведомление
                NavigateBasedOnNotificationType(payload);

                _logger.LogInformation($"Notification tapped: {payload.Title}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error handling notification tap: {ex.Message}");
            }
        }

        private PushNotificationPayload ParseNotificationPayload(IDictionary<string, object> data)
        {
            return new PushNotificationPayload
            {
                Title = data.ContainsKey("title") ? data["title"].ToString() : "Yess Loyalty",
                Body = data.ContainsKey("body") ? data["body"].ToString() : "",
                Type = data.ContainsKey("type") 
                    ? Enum.TryParse(data["type"].ToString(), out NotificationType type) 
                        ? type 
                        : NotificationType.System
                    : NotificationType.System,
                Data = data.ContainsKey("data") ? data["data"].ToString() : "",
                Timestamp = DateTime.UtcNow
            };
        }

        private void ShowLocalNotification(PushNotificationPayload payload)
        {
            // Локальное уведомление средствами MAUI
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO: Реализовать через MAUI Local Notifications
                // var notification = new NotificationRequest
                // {
                //     Title = payload.Title,
                //     Description = payload.Body,
                //     Schedule = { NotifyTime = DateTime.Now.AddSeconds(5) }
                // };
                // LocalNotificationCenter.Current.Show(notification);
            });
        }

        private void NavigateBasedOnNotificationType(PushNotificationPayload payload)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                switch (payload.Type)
                {
                    case NotificationType.Promotion:
                        // Переход на страницу акций
                        // await _navigationService.NavigateToAsync<PromotionsPage>();
                        break;
                    case NotificationType.Transaction:
                        // Переход на страницу транзакций
                        // await _navigationService.NavigateToAsync<TransactionsPage>();
                        break;
                    case NotificationType.Bonus:
                        // Переход на страницу бонусов
                        // await _navigationService.NavigateToAsync<BonusesPage>();
                        break;
                    default:
                        // Стандартный переход
                        // await _navigationService.NavigateToAsync<DashboardPage>();
                        break;
                }
            });
        }
    }
}
