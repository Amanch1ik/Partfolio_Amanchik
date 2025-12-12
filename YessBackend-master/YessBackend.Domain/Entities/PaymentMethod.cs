using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Методы оплаты
/// Соответствует таблице payment_methods в PostgreSQL
/// </summary>
public class PaymentMethod
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty; // bank_card, elsom, etc.
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? NameKy { get; set; }
    
    [MaxLength(100)]
    public string? NameEn { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(5,2)")]
    public decimal CommissionRate { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal MinCommission { get; set; } = 0.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? MaxCommission { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal MinAmount { get; set; } = 10.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal MaxAmount { get; set; } = 100000.0m;
    
    public bool IsActive { get; set; } = true;
    public bool IsInstant { get; set; } = false;
    
    public int ProcessingTimeMinutes { get; set; } = 5;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
