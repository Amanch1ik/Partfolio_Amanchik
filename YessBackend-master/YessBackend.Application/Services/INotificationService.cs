using System.Collections.Generic;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса уведомлений (с моками Twilio/Firebase/SendGrid)
/// </summary>
public interface INotificationService
{
    Task<object> SendNotificationAsync(int userId, string title, string message, string notificationType, Dictionary<string, object>? data = null);
    Task<object> SendBulkNotificationAsync(List<int> userIds, string title, string message, string notificationType, Dictionary<string, object>? data = null);
    Task<List<object>> GetUserNotificationsAsync(int userId, int page = 1, int perPage = 20, string? notificationType = null, string? status = null);
    Task MarkNotificationAsReadAsync(int notificationId);
    Task MarkAllNotificationsAsReadAsync(int userId);
    Task<int> GetUnreadCountAsync(int userId);
    Task<object> CreateNotificationTemplateAsync(string name, string titleTemplate, string messageTemplate, string notificationType, List<string> variables);
    Task<object> SendNotificationFromTemplateAsync(int templateId, int userId, Dictionary<string, string> variables);
    Task<object> GetNotificationStatsAsync();
}

