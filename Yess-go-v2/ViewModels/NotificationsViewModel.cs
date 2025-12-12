using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessGoFront.Data;
using YessGoFront.Data.Entities;
using YessGoFront.Services.Domain;

namespace YessGoFront.ViewModels;

public partial class NotificationsViewModel : BaseViewModel
{
    private readonly INotificationService _notificationService;
    private readonly IAuthService _authService;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<NotificationsViewModel>? _logger;

    [ObservableProperty]
    private bool isBusy;

    [ObservableProperty]
    private bool isRefreshing;

    [ObservableProperty]
    private string? errorMessage;

    [ObservableProperty]
    private bool hasError;

    [ObservableProperty]
    private bool hasMoreItems = true;

    [ObservableProperty]
    private int unreadCount;

    public ObservableCollection<Notification> Notifications { get; } = new();

    private int _currentPage = 1;
    private const int PageSize = 20;

    public IAsyncRelayCommand LoadNotificationsCommand { get; }
    public IAsyncRelayCommand LoadMoreCommand { get; }
    public IAsyncRelayCommand RefreshCommand { get; }
    public IAsyncRelayCommand<Notification> MarkAsReadCommand { get; }
    public IAsyncRelayCommand MarkAllAsReadCommand { get; }

    public NotificationsViewModel(
        INotificationService notificationService, 
        IAuthService authService,
        AppDbContext dbContext,
        ILogger<NotificationsViewModel>? logger = null)
    {
        _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _logger = logger;

        LoadNotificationsCommand = new AsyncRelayCommand(LoadInitialAsync);
        LoadMoreCommand = new AsyncRelayCommand(LoadMoreAsync, () => HasMoreItems && !IsBusy);
        RefreshCommand = new AsyncRelayCommand(RefreshAsync);
        MarkAsReadCommand = new AsyncRelayCommand<Notification?>(MarkAsReadAsync, notification => notification != null && notification.ReadAt == null);
        MarkAllAsReadCommand = new AsyncRelayCommand(MarkAllAsReadAsync, () => Notifications.Any(n => n.ReadAt == null));
    }

    public async Task LoadInitialAsync()
    {
        if (IsBusy)
        {
            System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] LoadInitialAsync: Already busy, skipping");
            return;
        }

        try
        {
            System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] LoadInitialAsync: Starting");
            IsBusy = true;
            HasError = false;
            ErrorMessage = null;

            // Get current user ID
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("Cannot load notifications: user is not authenticated");
                System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] LoadInitialAsync: User not authenticated");
                HasError = true;
                ErrorMessage = "Вы не авторизованы. Пожалуйста, войдите в аккаунт.";
                return;
            }

            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] LoadInitialAsync: User ID = {userId.Value}");
            _currentPage = 1;
            Notifications.Clear();
            HasMoreItems = true;

            await LoadPageAsync(_currentPage);
            await LoadUnreadCountAsync();
            
            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] LoadInitialAsync: Completed. Notifications count = {Notifications.Count}");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading notifications");
            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] LoadInitialAsync: Error - {ex}");
            HasError = true;
            ErrorMessage = "Не удалось загрузить уведомления. Пожалуйста, попробуйте позже.";
        }
        finally
        {
            IsBusy = false;
            System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] LoadInitialAsync: IsBusy set to false");
        }
    }

    private async Task LoadMoreAsync()
    {
        if (IsBusy || !HasMoreItems)
            return;

        try
        {
            IsBusy = true;
            _currentPage++;
            await LoadPageAsync(_currentPage);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading more notifications");
            HasError = true;
            ErrorMessage = "Не удалось загрузить больше уведомлений. Пожалуйста, попробуйте позже.";
            HasMoreItems = false;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task RefreshAsync()
    {
        if (IsBusy)
            return;

        try
        {
            IsRefreshing = true;
            _currentPage = 1;
            Notifications.Clear();
            HasMoreItems = true;
            await LoadPageAsync(_currentPage);
            await LoadUnreadCountAsync();
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    private async Task LoadPageAsync(int page)
    {
        try
        {
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("Cannot load notifications page: user is not authenticated");
                System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] Cannot load notifications: user is not authenticated");
                throw new UnauthorizedAccessException("Вы не авторизованы. Пожалуйста, войдите в аккаунт.");
            }

            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] Loading notifications for user {userId.Value}, page {page}, pageSize {PageSize}");
            var notifications = await _notificationService.GetNotificationsAsync(userId.Value, page, PageSize);
            
            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] Received {notifications.Count()} notifications from service");
            
            if (!notifications.Any())
            {
                System.Diagnostics.Debug.WriteLine("[NotificationsViewModel] No notifications returned, setting HasMoreItems = false");
                HasMoreItems = false;
                return;
            }

            foreach (var notification in notifications)
            {
                Notifications.Add(notification);
            }
            
            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] Added {notifications.Count()} notifications to collection. Total: {Notifications.Count}");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading notifications page {Page}", page);
            System.Diagnostics.Debug.WriteLine($"[NotificationsViewModel] Error loading notifications page {page}: {ex}");
            throw new Exception("Не удалось загрузить уведомления. Пожалуйста, проверьте подключение к интернету.", ex);
        }
    }

    private async Task LoadUnreadCountAsync()
    {
        try
        {
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("Cannot load unread count: user is not authenticated");
                UnreadCount = 0;
                return;
            }

            UnreadCount = await _notificationService.GetUnreadCountAsync(userId.Value);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading unread count");
            UnreadCount = 0;
        }
    }

    private async Task MarkAsReadAsync(Notification? notification)
    {
        if (notification == null || notification.ReadAt != null)
            return;

        try
        {
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("Cannot mark notification as read: user is not authenticated");
                throw new UnauthorizedAccessException("Вы не авторизованы. Пожалуйста, войдите в аккаунт.");
            }

            // Double-check that the notification belongs to the current user
            if (notification.UserId != userId.Value)
            {
                _logger?.LogWarning("User {UserId} attempted to mark notification {NotificationId} that doesn't belong to them", 
                    userId, notification.Id);
                throw new UnauthorizedAccessException("У вас нет прав для выполнения этого действия.");
            }

            await _notificationService.MarkAsReadAsync(notification.Id);
            notification.ReadAt = DateTime.UtcNow;
            UnreadCount = Math.Max(0, UnreadCount - 1);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error marking notification {NotificationId} as read", notification?.Id);
            throw new Exception("Не удалось отметить уведомление как прочитанное. Пожалуйста, попробуйте снова.", ex);
        }
    }

    private async Task MarkAllAsReadAsync()
    {
        try
        {
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("Cannot mark all notifications as read: user is not authenticated");
                throw new UnauthorizedAccessException("Вы не авторизованы. Пожалуйста, войдите в аккаунт.");
            }

            await _notificationService.MarkAllAsReadAsync(userId.Value);
            
            // Only update notifications that belong to the current user
            foreach (var notification in Notifications.Where(n => n.ReadAt == null && n.UserId == userId.Value))
            {
                notification.ReadAt = DateTime.UtcNow;
            }
            
            UnreadCount = 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error marking all notifications as read");
            throw new Exception("Не удалось отметить все уведомления как прочитанные. Пожалуйста, попробуйте снова.", ex);
        }
    }

    public string GetFormattedTime(DateTime dateTime)
    {
        var now = DateTime.UtcNow;
        var diff = now - dateTime;

        if (diff.TotalMinutes < 1)
            return "Только что";
        if (diff.TotalMinutes < 60)
            return $"{(int)diff.TotalMinutes} мин назад";
        if (diff.TotalHours < 24)
            return $"{(int)diff.TotalHours} ч назад";
        if (diff.TotalDays < 7)
            return $"{(int)diff.TotalDays} д назад";
        
        return dateTime.ToString("dd.MM.yyyy");
    }

    public string GetPriorityColor(NotificationPriority priority)
    {
        return priority switch
        {
            NotificationPriority.Urgent => "#DC2626",
            NotificationPriority.High => "#F59E0B",
            NotificationPriority.Normal => "#6B7280",
            NotificationPriority.Low => "#9CA3AF",
            _ => "#6B7280"
        };
    }
}