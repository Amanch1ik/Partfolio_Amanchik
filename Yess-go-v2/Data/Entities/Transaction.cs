using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Транзакция
/// </summary>
[Table("transactions")]
public class Transaction
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("type")]
    public string Type { get; set; } = string.Empty; // topup, discount, bonus, refund

    [Required]
    [Column("amount", TypeName = "numeric(10,2)")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }

    [Column("balance_before", TypeName = "numeric(10,2)")]
    public decimal? BalanceBefore { get; set; }

    [Column("balance_after", TypeName = "numeric(10,2)")]
    public decimal? BalanceAfter { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("status")]
    public string Status { get; set; } = string.Empty; // pending, completed, failed

    [MaxLength(500)]
    [Column("payment_url")]
    public string? PaymentUrl { get; set; }

    [Column("qr_code_data", TypeName = "text")]
    public string? QrCodeData { get; set; }

    [Column("partner_id")]
    public int? PartnerId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(PartnerId))]
    public Partner? Partner { get; set; }
}

