using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;
using YessGoFront.Config;
using YessGoFront.Data.Entities;
using YessGoFront.Infrastructure.Http;

namespace YessGoFront.Services.Api;

/// <summary>
/// Реализация API сервиса для работы с уведомлениями
/// </summary>
public class NotificationApiService : ApiClient, INotificationApiService
{
    public NotificationApiService(
        HttpClient httpClient,
        ILogger<NotificationApiService>? logger = null)
        : base(httpClient, logger)
    {
    }

    public async Task<IReadOnlyList<Notification>> GetNotificationsAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            // Используем endpoint /api/v1/notifications/me
            var endpoint = $"{ApiEndpoints.NotificationEndpoints.List}/me?page={page}&per_page={pageSize}";
            Logger?.LogDebug("Запрос уведомлений через endpoint: {Endpoint}", endpoint);
            
            var response = await GetAsync<NotificationApiResponse>(endpoint, ct);
            
            if (response?.Notifications == null)
            {
                Logger?.LogWarning("API вернул null для уведомлений");
                return Array.Empty<Notification>();
            }

            // Преобразуем API ответ в локальные сущности
            var notifications = response.Notifications.Select(ConvertToNotification).ToList();
            
            Logger?.LogInformation("Получено уведомлений: {Count}", notifications.Count);
            return notifications;
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Ошибка получения уведомлений из API");
            throw;
        }
    }

    public async Task MarkAsReadAsync(int notificationId, CancellationToken ct = default)
    {
        try
        {
            var endpoint = ApiEndpoints.NotificationEndpoints.MarkAsRead(notificationId);
            Logger?.LogDebug("Отметка уведомления {NotificationId} как прочитанного", notificationId);
            
            await PatchAsync<object, object>(endpoint, new { }, ct);
            Logger?.LogInformation("Уведомление {NotificationId} отмечено как прочитанное", notificationId);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Ошибка отметки уведомления {NotificationId} как прочитанного", notificationId);
            throw;
        }
    }

    public async Task MarkAllAsReadAsync(int userId, CancellationToken ct = default)
    {
        try
        {
            var endpoint = $"{ApiEndpoints.NotificationEndpoints.List}/user/{userId}/mark-all-read";
            Logger?.LogDebug("Отметка всех уведомлений пользователя {UserId} как прочитанных", userId);
            
            await PatchAsync<object, object>(endpoint, new { }, ct);
            Logger?.LogInformation("Все уведомления пользователя {UserId} отмечены как прочитанные", userId);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Ошибка отметки всех уведомлений пользователя {UserId} как прочитанных", userId);
            throw;
        }
    }

    public async Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default)
    {
        try
        {
            var endpoint = $"{ApiEndpoints.NotificationEndpoints.List}/user/{userId}/unread-count";
            Logger?.LogDebug("Запрос количества непрочитанных уведомлений для пользователя {UserId}", userId);
            
            var response = await GetAsync<UnreadCountResponse>(endpoint, ct);
            var count = response?.UnreadCount ?? 0;
            
            Logger?.LogInformation("Непрочитанных уведомлений для пользователя {UserId}: {Count}", userId, count);
            return count;
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Ошибка получения количества непрочитанных уведомлений для пользователя {UserId}", userId);
            return 0;
        }
    }

    private Notification ConvertToNotification(NotificationApiItem apiItem)
    {
        // Преобразуем строковый тип из API в enum
        var notificationType = ParseNotificationType(apiItem.Type);
        
        return new Notification
        {
            Id = apiItem.Id,
            UserId = apiItem.UserId,
            Title = apiItem.Title ?? string.Empty,
            Message = apiItem.Body ?? string.Empty,
            NotificationType = notificationType,
            Priority = NotificationPriority.Normal, // API не возвращает приоритет, используем по умолчанию
            Status = apiItem.IsRead ? NotificationStatus.Read : NotificationStatus.Delivered,
            CreatedAt = apiItem.CreatedAt,
            ReadAt = apiItem.IsRead ? apiItem.CreatedAt : null,
            DeliveredAt = apiItem.CreatedAt
        };
    }

    private NotificationType ParseNotificationType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
            return NotificationType.InApp;

        return type.ToLower() switch
        {
            "push" => NotificationType.Push,
            "sms" => NotificationType.Sms,
            "email" => NotificationType.Email,
            "inapp" or "in_app" => NotificationType.InApp,
            _ => NotificationType.InApp
        };
    }

    // Классы для десериализации API ответа
    private class NotificationApiResponse
    {
        [JsonPropertyName("notifications")]
        public List<NotificationApiItem>? Notifications { get; set; }
        
        [JsonPropertyName("total")]
        public int Total { get; set; }
        
        [JsonPropertyName("page")]
        public int Page { get; set; }
        
        [JsonPropertyName("per_page")]
        public int PerPage { get; set; }
    }

    private class NotificationApiItem
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        
        [JsonPropertyName("user_id")]
        public int UserId { get; set; }
        
        [JsonPropertyName("title")]
        public string? Title { get; set; }
        
        [JsonPropertyName("body")]
        public string? Body { get; set; }
        
        [JsonPropertyName("type")]
        public string? Type { get; set; }
        
        [JsonPropertyName("is_read")]
        public bool IsRead { get; set; }
        
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    private class UnreadCountResponse
    {
        [JsonPropertyName("unread_count")]
        public int UnreadCount { get; set; }
    }
}

