using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessGoFront.Data.Entities;

/// <summary>
/// Кошелёк пользователя
/// </summary>
[Table("wallets")]
public class Wallet
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("balance", TypeName = "numeric(10,2)")]
    [Range(0, double.MaxValue, ErrorMessage = "Balance cannot be negative")]
    public decimal Balance { get; set; } = 0.00m;

    [Column("last_updated")]
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}

