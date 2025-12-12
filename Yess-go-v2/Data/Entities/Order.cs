using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Заказ
/// </summary>
[Table("orders")]
public class Order
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("partner_id")]
    public int PartnerId { get; set; }

    [Required]
    [Column("order_total", TypeName = "numeric(10,2)")]
    [Range(0, double.MaxValue)]
    public decimal OrderTotal { get; set; }

    [Required]
    [Column("discount", TypeName = "numeric(10,2)")]
    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; } = 0.00m;

    [Required]
    [Column("final_amount", TypeName = "numeric(10,2)")]
    [Range(0, double.MaxValue)]
    public decimal FinalAmount { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("idempotency_key")]
    public string IdempotencyKey { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(PartnerId))]
    public Partner Partner { get; set; } = null!;
}

