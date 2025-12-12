using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Тип уведомления
/// </summary>
public enum NotificationType
{
    Push,
    Sms,
    Email,
    InApp
}

/// <summary>
/// Статус уведомления
/// </summary>
public enum NotificationStatus
{
    Pending,
    Sent,
    Failed,
    Delivered,
    Read
}

/// <summary>
/// Приоритет уведомления
/// </summary>
public enum NotificationPriority
{
    Low,
    Normal,
    High,
    Urgent
}

/// <summary>
/// Уведомление
/// </summary>
[Table("notifications")]
public class Notification
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column("message", TypeName = "text")]
    public string Message { get; set; } = string.Empty;

    [Required]
    [Column("notification_type")]
    public NotificationType NotificationType { get; set; }

    [Column("priority")]
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;

    [Column("status")]
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    [Column("data", TypeName = "jsonb")]
    public Dictionary<string, object>? Data { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [Column("sent_at")]
    public DateTime? SentAt { get; set; }

    [Column("delivered_at")]
    public DateTime? DeliveredAt { get; set; }

    [Column("read_at")]
    public DateTime? ReadAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    // Helper properties for UI
    [NotMapped]
    public string Icon => GetNotificationIcon();

    [NotMapped]
    public bool IsRead => ReadAt.HasValue;

    private string GetNotificationIcon()
    {
        // Сначала проверяем категорию из Data, если есть
        if (Data != null && Data.TryGetValue("category", out var categoryObj))
        {
            var category = categoryObj?.ToString()?.ToLower();
            return category switch
            {
                "achievement" => "🏆", // Достижения
                "finance" => "💰",     // Финансы/кешбэк
                "promotion" => "🎁",   // Акции/промо
                "referral" => "🎯",    // Рефералы
                _ => GetIconByTitle()
            };
        }
        
        return GetIconByTitle();
    }
    
    private string GetIconByTitle()
    {
        var titleLower = Title.ToLower();
        
        // Проверяем по ключевым словам в заголовке
        if (titleLower.Contains("достижен") || titleLower.Contains("уровен") || titleLower.Contains("бронз") || titleLower.Contains("серебр") || titleLower.Contains("золот"))
            return "🏆";
        
        if (titleLower.Contains("кешбэк") || titleLower.Contains("начислен") || titleLower.Contains("баланс") || titleLower.Contains("пополнен"))
            return "💰";
        
        if (titleLower.Contains("акци") || titleLower.Contains("предложен") || titleLower.Contains("скидк") || titleLower.Contains("промокод"))
            return "🎁";
        
        if (titleLower.Contains("приглашен") || titleLower.Contains("реферал") || titleLower.Contains("друг"))
            return "🎯";
        
        if (titleLower.Contains("партнёр") || titleLower.Contains("новый"))
            return "⭐";
        
        if (titleLower.Contains("напоминан") || titleLower.Contains("не забудь"))
            return "⏰";
        
        if (titleLower.Contains("день рожден"))
            return "🎂";
        
        if (titleLower.Contains("отчёт") || titleLower.Contains("статистик"))
            return "📊";
        
        // По умолчанию по типу
        return NotificationType switch
        {
            NotificationType.Push => "🔔",
            NotificationType.Sms => "💬",
            NotificationType.Email => "✉️",
            NotificationType.InApp => "ℹ️",
            _ => "🔔"
        };
    }
}

