using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Аналитика платежей
/// Соответствует таблице payment_analytics в PostgreSQL
/// </summary>
public class PaymentAnalytics
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public DateTime Date { get; set; }
    
    // Статистика по методам оплаты
    public int BankCardCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal BankCardAmount { get; set; } = 0.0m;
    
    public int ElsomCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal ElsomAmount { get; set; } = 0.0m;
    
    public int MobileBalanceCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal MobileBalanceAmount { get; set; } = 0.0m;
    
    public int ElkartCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal ElkartAmount { get; set; } = 0.0m;
    
    public int CashTerminalCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal CashTerminalAmount { get; set; } = 0.0m;
    
    public int BankTransferCount { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal BankTransferAmount { get; set; } = 0.0m;
    
    // Общая статистика
    public int TotalTransactions { get; set; } = 0;
    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalAmount { get; set; } = 0.0m;
    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalCommission { get; set; } = 0.0m;
    
    public int SuccessfulTransactions { get; set; } = 0;
    public int FailedTransactions { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
