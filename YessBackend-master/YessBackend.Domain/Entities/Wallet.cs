using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Кошелек пользователя
/// Соответствует таблице wallets в PostgreSQL
/// </summary>
public class Wallet
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    // Баланс в сомах (для пополнения)
    [Column(TypeName = "decimal(10,2)")]
    public decimal Balance { get; set; } = 0.00m;
    
    // Виртуальная монета Yess!Coin (основная валюта лояльности)
    [Column(TypeName = "decimal(10,2)")]
    public decimal YescoinBalance { get; set; } = 0.00m;
    
    // Статистика
    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalEarned { get; set; } = 0.00m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalSpent { get; set; } = 0.00m;
    
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
