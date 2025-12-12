using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Возвраты средств
/// Соответствует таблице refunds в PostgreSQL
/// </summary>
public class Refund
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int TransactionId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }
    
    [Required]
    public string Reason { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, success, failed, cancelled
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    
    public string? AdminNotes { get; set; }
    
    [MaxLength(255)]
    public string? GatewayRefundId { get; set; }
    
    // Navigation properties
    [ForeignKey("TransactionId")]
    public virtual Transaction Transaction { get; set; } = null!;
}
