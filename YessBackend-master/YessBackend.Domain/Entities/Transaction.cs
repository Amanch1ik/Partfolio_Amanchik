using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Транзакции
/// Соответствует таблице transactions в PostgreSQL
/// </summary>
public class Transaction
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    public int? PartnerId { get; set; }
    public int? OrderId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // topup, discount, bonus, refund, payment
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal Commission { get; set; } = 0.0m;
    
    [MaxLength(50)]
    public string? PaymentMethod { get; set; }
    
    [MaxLength(255)]
    public string? GatewayTransactionId { get; set; }
    
    public string? ErrorMessage { get; set; }
    public DateTime? ProcessedAt { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? BalanceBefore { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? BalanceAfter { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, completed, failed
    
    [MaxLength(500)]
    public string? PaymentUrl { get; set; }
    
    public string? QrCodeData { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal YescoinUsed { get; set; } = 0.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal YescoinEarned { get; set; } = 0.0m;
    
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    [ForeignKey("PartnerId")]
    public virtual Partner? Partner { get; set; }
    
    [ForeignKey("OrderId")]
    public virtual Order? Order { get; set; }
    
    public virtual ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}
