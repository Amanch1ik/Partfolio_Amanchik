using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Модель пользователя системы
/// Соответствует таблице users в PostgreSQL
/// </summary>
public class User
{
    [Key]
    public int Id { get; set; }
    
    // Основная информация
    public string? Name { get; set; } // Для обратной совместимости
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Phone { get; set; } = string.Empty;
    
    public string? PasswordHash { get; set; }
    
    // Профиль
    [MaxLength(500)]
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    [MaxLength(500)]
    public string? Address { get; set; }
    
    // Верификация
    public bool PhoneVerified { get; set; } = false;
    public bool EmailVerified { get; set; } = false;
    [MaxLength(10)]
    public string? VerificationCode { get; set; }
    public DateTime? VerificationExpiresAt { get; set; }
    
    // Push уведомления (храним как JSON строку в колонке jsonb)
    // Формат по умолчанию: "[]"
    [Column(TypeName = "jsonb")]
    public string DeviceTokens { get; set; } = "[]";
    public bool PushEnabled { get; set; } = true;
    public bool SmsEnabled { get; set; } = true;
    
    // Геолокация
    public int? CityId { get; set; }
    [MaxLength(50)]
    public string? Latitude { get; set; }
    [MaxLength(50)]
    public string? Longitude { get; set; }
    
    // Реферальная система
    [MaxLength(50)]
    public string? ReferralCode { get; set; }
    public int? ReferredBy { get; set; }
    
    // Активность
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; } = false;
    public DateTime? LastLoginAt { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("CityId")]
    public virtual City? City { get; set; }
    
    public virtual Wallet? Wallet { get; set; }
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
