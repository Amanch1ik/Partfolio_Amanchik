using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

public class Notification
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    [MaxLength(50)]
    public string Type { get; set; } = "info";
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}

public class NotificationSettings
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public bool PushEnabled { get; set; } = true;
    public bool EmailEnabled { get; set; } = true;
    public bool SmsEnabled { get; set; } = false;
}

public class NotificationTemplate
{
    [Key]
    public int Id { get; set; }
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
}

public class NotificationLog
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(50)]
    public string Channel { get; set; } = string.Empty;
    [MaxLength(255)]
    public string? Recipient { get; set; }
    [MaxLength(255)]
    public string Subject { get; set; } = string.Empty;
    public string? Content { get; set; }
    [MaxLength(50)]
    public string Status { get; set; } = "pending";
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
}
