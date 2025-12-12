using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Категория акции
/// </summary>
public enum PromotionCategory
{
    General,
    Partner,
    Seasonal,
    Referral,
    Loyalty,
    Special
}

/// <summary>
/// Тип акции
/// </summary>
public enum PromotionType
{
    DiscountPercent,
    DiscountAmount,
    Cashback,
    BonusPoints,
    FreeShipping,
    Gift
}

/// <summary>
/// Статус акции
/// </summary>
public enum PromotionStatus
{
    Draft,
    Active,
    Paused,
    Expired,
    Cancelled
}

/// <summary>
/// Промо-акция
/// </summary>
[Table("promotions")]
public class Promotion
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description", TypeName = "text")]
    public string? Description { get; set; }

    [Required]
    [Column("category")]
    public PromotionCategory Category { get; set; }

    [Required]
    [Column("promotion_type")]
    public PromotionType PromotionType { get; set; }

    [Column("partner_id")]
    public int? PartnerId { get; set; }

    // Условия акции
    [Column("discount_percent")]
    public double? DiscountPercent { get; set; }

    [Column("discount_amount")]
    public double? DiscountAmount { get; set; }

    [Column("min_order_amount")]
    public double? MinOrderAmount { get; set; }

    [Column("max_discount_amount")]
    public double? MaxDiscountAmount { get; set; }

    // Ограничения
    [Column("usage_limit")]
    public int? UsageLimit { get; set; }

    [Column("usage_limit_per_user")]
    public int UsageLimitPerUser { get; set; } = 1;

    [Column("usage_count")]
    public int UsageCount { get; set; } = 0;

    // Временные рамки
    [Required]
    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Required]
    [Column("end_date")]
    public DateTime EndDate { get; set; }

    // Статус
    [Column("status")]
    public PromotionStatus Status { get; set; } = PromotionStatus.Draft;

    // Дополнительные условия
    [Column("conditions", TypeName = "text")]
    public string? Conditions { get; set; }

    // Метаданные
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(PartnerId))]
    public Partner? Partner { get; set; }
}

