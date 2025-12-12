using YessGoFront.Data.Entities;

namespace YessGoFront.Services.Api;

/// <summary>
/// API сервис для работы с уведомлениями
/// </summary>
public interface INotificationApiService
{
    /// <summary>
    /// Получить уведомления текущего пользователя
    /// </summary>
    Task<IReadOnlyList<Notification>> GetNotificationsAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    /// <summary>
    /// Отметить уведомление как прочитанное
    /// </summary>
    Task MarkAsReadAsync(int notificationId, CancellationToken ct = default);

    /// <summary>
    /// Отметить все уведомления как прочитанные
    /// </summary>
    Task MarkAllAsReadAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Получить количество непрочитанных уведомлений
    /// </summary>
    Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default);
}

