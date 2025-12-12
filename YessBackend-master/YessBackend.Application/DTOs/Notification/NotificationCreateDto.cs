using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Notification;

/// <summary>
/// DTO для создания уведомления
/// </summary>
public class NotificationCreateDto
{
    [JsonPropertyName("user_id")]
    [Required]
    public int UserId { get; set; }

    [JsonPropertyName("title")]
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    [Required]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("notification_type")]
    [Required]
    public string NotificationType { get; set; } = "in_app"; // push, sms, email, in_app

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "normal"; // low, normal, high, urgent

    [JsonPropertyName("data")]
    public Dictionary<string, object>? Data { get; set; }

    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }
}

/// <summary>
/// DTO для массовой отправки уведомлений
/// </summary>
public class BulkNotificationCreateDto
{
    [JsonPropertyName("user_ids")]
    [Required]
    public List<int> UserIds { get; set; } = new();

    [JsonPropertyName("title")]
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    [Required]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("notification_type")]
    [Required]
    public string NotificationType { get; set; } = "in_app";

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "normal";

    [JsonPropertyName("data")]
    public Dictionary<string, object>? Data { get; set; }
}

/// <summary>
/// DTO для создания шаблона уведомления
/// </summary>
public class NotificationTemplateCreateDto
{
    [JsonPropertyName("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("title_template")]
    [Required]
    public string TitleTemplate { get; set; } = string.Empty;

    [JsonPropertyName("message_template")]
    [Required]
    public string MessageTemplate { get; set; } = string.Empty;

    [JsonPropertyName("notification_type")]
    [Required]
    public string NotificationType { get; set; } = "in_app";

    [JsonPropertyName("variables")]
    public List<string> Variables { get; set; } = new();
}

