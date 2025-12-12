using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Пользователь системы
/// </summary>
[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    // Основная информация
    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("password_hash")]
    public string? PasswordHash { get; set; }

    // Профиль
    [MaxLength(500)]
    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("bio", TypeName = "text")]
    public string? Bio { get; set; }

    [MaxLength(500)]
    [Column("address")]
    public string? Address { get; set; }

    // Верификация
    [Column("phone_verified")]
    public bool PhoneVerified { get; set; } = false;

    [Column("email_verified")]
    public bool EmailVerified { get; set; } = false;

    [MaxLength(10)]
    [Column("verification_code")]
    public string? VerificationCode { get; set; }

    [Column("verification_expires_at")]
    public DateTime? VerificationExpiresAt { get; set; }

    // Push уведомления
    [Column("device_tokens", TypeName = "jsonb")]
    public List<string> DeviceTokens { get; set; } = new();

    [Column("push_enabled")]
    public bool PushEnabled { get; set; } = true;

    [Column("sms_enabled")]
    public bool SmsEnabled { get; set; } = true;

    // Геолокация
    [Column("city_id")]
    public int? CityId { get; set; }

    [MaxLength(50)]
    [Column("latitude")]
    public string? Latitude { get; set; }

    [MaxLength(50)]
    [Column("longitude")]
    public string? Longitude { get; set; }

    // Реферальная система
    [MaxLength(50)]
    [Column("referral_code")]
    public string? ReferralCode { get; set; }

    [Column("referred_by")]
    public int? ReferredBy { get; set; }

    // Активность
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_blocked")]
    public bool IsBlocked { get; set; } = false;

    [Column("last_login_at")]
    public DateTime? LastLoginAt { get; set; }

    // Timestamps
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(CityId))]
    public City? City { get; set; }

    public Wallet? Wallet { get; set; }
    public List<Transaction> Transactions { get; set; } = new();
    public List<Order> Orders { get; set; } = new();
    public List<Notification> Notifications { get; set; } = new();
}

