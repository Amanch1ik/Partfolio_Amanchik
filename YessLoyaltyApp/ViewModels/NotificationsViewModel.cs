using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using YessLoyaltyApp.Services;

namespace YessLoyaltyApp.ViewModels
{
    public class NotificationsViewModel : INotifyPropertyChanged
    {
        private readonly IApiService _apiService;
        private readonly IErrorHandlingService _errorHandlingService;
        private readonly IPushNotificationService _pushNotificationService;
        private readonly IOfflineService _offlineService;

        private ObservableCollection<NotificationDto> _notifications;
        private bool _isLoading;
        private bool _hasMoreNotifications = true;
        private int _currentPage = 1;
        private const int PAGE_SIZE = 20;

        public ObservableCollection<NotificationDto> Notifications 
        { 
            get => _notifications; 
            private set 
            {
                _notifications = value;
                OnPropertyChanged();
            }
        }

        public bool IsLoading 
        { 
            get => _isLoading; 
            private set 
            {
                _isLoading = value;
                OnPropertyChanged();
                LoadMoreNotificationsCommand.CanExecute(null);
            }
        }

        public bool HasMoreNotifications 
        { 
            get => _hasMoreNotifications; 
            private set 
            {
                _hasMoreNotifications = value;
                OnPropertyChanged();
            }
        }

        public ICommand LoadMoreNotificationsCommand { get; }
        public ICommand MarkNotificationAsReadCommand { get; }
        public ICommand RefreshNotificationsCommand { get; }

        public NotificationsViewModel(
            IApiService apiService,
            IErrorHandlingService errorHandlingService,
            IPushNotificationService pushNotificationService,
            IOfflineService offlineService)
        {
            _apiService = apiService;
            _errorHandlingService = errorHandlingService;
            _pushNotificationService = pushNotificationService;
            _offlineService = offlineService;

            Notifications = new ObservableCollection<NotificationDto>();

            LoadMoreNotificationsCommand = new Command(
                async () => await LoadMoreNotificationsAsync(), 
                () => !IsLoading && HasMoreNotifications
            );

            MarkNotificationAsReadCommand = new Command<NotificationDto>(
                async (notification) => await MarkNotificationAsReadAsync(notification)
            );

            RefreshNotificationsCommand = new Command(async () => await RefreshNotificationsAsync());

            // Подписка на входящие уведомления
            _pushNotificationService.NotificationReceived += OnPushNotificationReceived;

            // Первоначальная загрузка
            LoadMoreNotificationsAsync();
        }

        private void OnPushNotificationReceived(object sender, PushNotificationPayload payload)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // Добавляем новое уведомление в начало списка
                var newNotification = new NotificationDto
                {
                    Id = 0, // Временный ID
                    Title = payload.Title,
                    Body = payload.Body,
                    Type = ConvertPayloadTypeToNotificationType(payload.Type),
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    Data = payload.Data
                };

                Notifications.Insert(0, newNotification);
            });
        }

        private NotificationType ConvertPayloadTypeToNotificationType(NotificationType payloadType)
        {
            // Преобразование типов уведомлений
            return payloadType switch
            {
                NotificationType.Promotion => NotificationType.Promotion,
                NotificationType.Transaction => NotificationType.Transaction,
                NotificationType.Bonus => NotificationType.Bonus,
                NotificationType.Security => NotificationType.Security,
                _ => NotificationType.System
            };
        }

        private async Task LoadMoreNotificationsAsync()
        {
            if (IsLoading || !HasMoreNotifications) return;

            try 
            {
                IsLoading = true;

                // Используем offline-сервис для поддержки работы без интернета
                var result = await _offlineService.ExecuteWithOfflineSupportAsync(
                    $"notifications_page_{_currentPage}",
                    // Онлайн-операция
                    async () => 
                    {
                        var response = await _apiService.GetNotificationsAsync(_currentPage, PAGE_SIZE);
                        
                        if (response.IsSuccess)
                        {
                            return response.Data;
                        }
                        else
                        {
                            await _errorHandlingService.DisplayErrorAsync(response.ErrorMessage);
                            return new List<NotificationDto>();
                        }
                    },
                    // Оффлайн-операция (получение из кэша)
                    async () => await GetCachedNotificationsAsync()
                );

                // Если получены новые уведомления
                if (result?.Any() == true)
                {
                    foreach (var notification in result)
                    {
                        Notifications.Add(notification);
                    }
                    _currentPage++;
                }
                else
                {
                    HasMoreNotifications = false;
                }
            }
            catch (Exception ex)
            {
                await _errorHandlingService.DisplayErrorAsync("Не удалось загрузить уведомления");
                _errorHandlingService.LogError(ex);
            }
            finally 
            {
                IsLoading = false;
            }
        }

        private async Task RefreshNotificationsAsync()
        {
            // Сброс состояния
            _currentPage = 1;
            HasMoreNotifications = true;
            Notifications.Clear();

            await LoadMoreNotificationsAsync();
        }

        private async Task MarkNotificationAsReadAsync(NotificationDto notification)
        {
            try 
            {
                // Оптимистичное обновление UI
                notification.IsRead = true;

                // Отправка на бэкенд
                await _apiService.MarkNotificationAsReadAsync(notification.Id);
            }
            catch (Exception ex)
            {
                // Откат изменений в случае ошибки
                notification.IsRead = false;
                await _errorHandlingService.DisplayErrorAsync("Не удалось отметить уведомление");
                _errorHandlingService.LogError(ex);
            }
        }

        private async Task<List<NotificationDto>> GetCachedNotificationsAsync()
        {
            // Получение кэшированных уведомлений
            return await _offlineService.GetOfflineDataAsync<List<NotificationDto>>("notifications") 
                   ?? new List<NotificationDto>();
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        // Освобождение ресурсов
        public void Dispose()
        {
            _pushNotificationService.NotificationReceived -= OnPushNotificationReceived;
        }
    }
}
