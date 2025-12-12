using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Партнёр
/// </summary>
[Table("partners")]
public class Partner
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    // Основная информация
    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description", TypeName = "text")]
    public string? Description { get; set; }

    [MaxLength(100)]
    [Column("category")]
    public string? Category { get; set; }

    [Column("city_id")]
    public int? CityId { get; set; }

    // Изображения
    [MaxLength(500)]
    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    [Column("cover_image_url")]
    public string? CoverImageUrl { get; set; }

    [MaxLength(500)]
    [Column("qr_code_url")]
    public string? QrCodeUrl { get; set; }

    // Контактная информация
    [MaxLength(50)]
    [Column("phone")]
    public string? Phone { get; set; }

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(500)]
    [Column("website")]
    public string? Website { get; set; }

    [Column("social_media", TypeName = "jsonb")]
    public Dictionary<string, string>? SocialMedia { get; set; }

    // Финансы
    [MaxLength(100)]
    [Column("bank_account")]
    public string? BankAccount { get; set; }

    [Required]
    [Column("max_discount_percent", TypeName = "numeric(5,2)")]
    [Range(0, 100)]
    public decimal MaxDiscountPercent { get; set; }

    [Column("cashback_rate", TypeName = "numeric(5,2)")]
    [Range(0, 100)]
    public decimal CashbackRate { get; set; } = 5.0m;

    [Column("default_cashback_rate")]
    public double DefaultCashbackRate { get; set; } = 5.0;

    // Владелец
    [Column("owner_id")]
    public int? OwnerId { get; set; }

    // Статусы
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    // Геолокационные данные
    [Column("latitude")]
    public double? Latitude { get; set; }

    [Column("longitude")]
    public double? Longitude { get; set; }

    // Timestamps
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(CityId))]
    public City? City { get; set; }

    public List<PartnerLocation> Locations { get; set; } = new();
    public List<Order> Orders { get; set; } = new();
    public List<Transaction> Transactions { get; set; } = new();
    public List<Promotion> Promotions { get; set; } = new();
}

/// <summary>
/// Локация партнёра
/// </summary>
[Table("partner_locations")]
public class PartnerLocation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("partner_id")]
    public int PartnerId { get; set; }

    [MaxLength(500)]
    [Column("address")]
    public string? Address { get; set; }

    [Column("latitude", TypeName = "numeric(10,8)")]
    public decimal? Latitude { get; set; }

    [Column("longitude", TypeName = "numeric(11,8)")]
    public decimal? Longitude { get; set; }

    [MaxLength(50)]
    [Column("phone_number")]
    public string? PhoneNumber { get; set; }

    [Column("working_hours", TypeName = "jsonb")]
    public Dictionary<string, string>? WorkingHours { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_main_location")]
    public bool IsMainLocation { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(PartnerId))]
    public Partner Partner { get; set; } = null!;
}

