using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

public class Promotion
{
    [Key]
    public int Id { get; set; }
    public int PartnerId { get; set; }
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? ValidUntil { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PromoCode
{
    [Key]
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int? PromotionId { get; set; }
    public int? PartnerId { get; set; }
    public DateTime? ValidUntil { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UserPromoCode
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PromoCodeId { get; set; }
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
}

public class PromotionUsage
{
    [Key]
    public int Id { get; set; }
    public int PromotionId { get; set; }
    public int UserId { get; set; }
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
}
