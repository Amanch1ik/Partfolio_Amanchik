using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис уведомлений с моками Twilio/Firebase/SendGrid
/// </summary>
public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationService> _logger;
    private readonly HttpClient _httpClient;

    public NotificationService(
        ApplicationDbContext context,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<NotificationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<object> SendNotificationAsync(int userId, string title, string message, string notificationType, Dictionary<string, object>? data = null)
    {
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            // Создаем уведомление в БД
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Body = message,
                Type = notificationType,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Отправляем уведомление через внешние сервисы (мок)
            var success = await SendToExternalServiceAsync(notificationType, user, title, message, data);

            _logger.LogInformation(
                "Notification sent (mock): UserId={UserId}, Type={Type}, Success={Success}",
                userId, notificationType, success);

            return new
            {
                id = notification.Id,
                user_id = userId,
                title = title,
                message = message,
                notification_type = notificationType,
                status = success ? "sent" : "failed",
                created_at = notification.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления");
            throw;
        }
    }

    public async Task<object> SendBulkNotificationAsync(List<int> userIds, string title, string message, string notificationType, Dictionary<string, object>? data = null)
    {
        try
        {
            var notifications = new List<Notification>();

            foreach (var userId in userIds)
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Title = title,
                    Body = message,
                    Type = notificationType,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                notifications.Add(notification);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk notification sent (mock): Count={Count}", notifications.Count);

            return new
            {
                message = $"Bulk notification scheduled for {notifications.Count} users",
                notifications_count = notifications.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка массовой отправки уведомлений");
            throw;
        }
    }

    public async Task<List<object>> GetUserNotificationsAsync(int userId, int page = 1, int perPage = 20, string? notificationType = null, string? status = null)
    {
        try
        {
            var query = _context.Notifications
                .Where(n => n.UserId == userId);

            if (!string.IsNullOrEmpty(notificationType))
            {
                query = query.Where(n => n.Type == notificationType);
            }

            var total = await query.CountAsync();
            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();

            return notifications.Select(n => new
            {
                id = n.Id,
                user_id = n.UserId,
                title = n.Title,
                message = n.Body,
                notification_type = n.Type,
                status = n.IsRead ? "read" : "unread",
                created_at = n.CreatedAt
            }).Cast<object>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уведомлений");
            throw;
        }
    }

    public async Task MarkNotificationAsReadAsync(int notificationId)
    {
        try
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId);

            if (notification != null)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отметки уведомления как прочитанного");
            throw;
        }
    }

    public async Task MarkAllNotificationsAsReadAsync(int userId)
    {
        try
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отметки всех уведомлений как прочитанных");
            throw;
        }
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        try
        {
            return await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка подсчета непрочитанных уведомлений");
            throw;
        }
    }

    public async Task<object> CreateNotificationTemplateAsync(string name, string titleTemplate, string messageTemplate, string notificationType, List<string> variables)
    {
        try
        {
            var template = new NotificationTemplate
            {
                Code = name.ToLower().Replace(" ", "_"),
                Title = titleTemplate,
                Body = messageTemplate
            };

            _context.NotificationTemplates.Add(template);
            await _context.SaveChangesAsync();

            return new
            {
                message = "Template created successfully",
                template_id = template.Id
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания шаблона уведомления");
            throw;
        }
    }

    public async Task<object> SendNotificationFromTemplateAsync(int templateId, int userId, Dictionary<string, string> variables)
    {
        try
        {
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
            {
                throw new InvalidOperationException("Template not found");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            // Заменяем переменные в шаблоне
            var title = template.Title;
            var message = template.Body ?? "";

            foreach (var kvp in variables)
            {
                title = title.Replace($"{{{kvp.Key}}}", kvp.Value);
                message = message.Replace($"{{{kvp.Key}}}", kvp.Value);
            }

            // Создаем уведомление
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Body = message,
                Type = "in_app",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return new
            {
                message = "Notification sent from template",
                notification_id = notification.Id
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления из шаблона");
            throw;
        }
    }

    public async Task<object> GetNotificationStatsAsync()
    {
        try
        {
            var totalNotifications = await _context.Notifications.CountAsync();
            var readNotifications = await _context.Notifications.CountAsync(n => n.IsRead);
            var unreadNotifications = totalNotifications - readNotifications;

            var pushCount = await _context.Notifications.CountAsync(n => n.Type == "push");
            var smsCount = await _context.Notifications.CountAsync(n => n.Type == "sms");
            var emailCount = await _context.Notifications.CountAsync(n => n.Type == "email");

            return new
            {
                total_notifications = totalNotifications,
                read_notifications = readNotifications,
                unread_notifications = unreadNotifications,
                by_type = new
                {
                    push = pushCount,
                    sms = smsCount,
                    email = emailCount
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики уведомлений");
            throw;
        }
    }

    private async Task<bool> SendToExternalServiceAsync(string notificationType, User user, string title, string message, Dictionary<string, object>? data)
    {
        // Мок-реализация для внешних сервисов
        try
        {
            if (notificationType == "push")
            {
                // Мок Firebase
                _logger.LogInformation("Mock Firebase Push: UserId={UserId}, Title={Title}", user.Id, title);
                return true;
            }
            else if (notificationType == "sms")
            {
                // Мок Twilio
                _logger.LogInformation("Mock Twilio SMS: Phone={Phone}, Message={Message}", user.Phone, message);
                return true;
            }
            else if (notificationType == "email")
            {
                // Мок SendGrid
                _logger.LogInformation("Mock SendGrid Email: Email={Email}, Subject={Subject}", user.Email, title);
                return true;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки через внешний сервис");
            return false;
        }
    }
}

