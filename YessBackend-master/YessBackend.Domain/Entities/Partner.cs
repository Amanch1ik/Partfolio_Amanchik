using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Партнер системы
/// Соответствует таблице partners в PostgreSQL
/// </summary>
public class Partner
{
    [Key]
    public int Id { get; set; }
    
    // Основная информация
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? Category { get; set; }
    
    public int? CityId { get; set; }
    
    // Изображения
    [MaxLength(500)]
    public string? LogoUrl { get; set; }
    
    [MaxLength(500)]
    public string? CoverImageUrl { get; set; }
    
    [MaxLength(500)]
    public string? QrCodeUrl { get; set; }
    
    // Контактная информация
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(255)]
    public string? Email { get; set; }
    
    [MaxLength(500)]
    public string? Website { get; set; }
    
    public Dictionary<string, string>? SocialMedia { get; set; }
    
    // Финансы
    [MaxLength(100)]
    public string? BankAccount { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(5,2)")]
    public decimal MaxDiscountPercent { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal CashbackRate { get; set; } = 5.0m;
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal DefaultCashbackRate { get; set; } = 5.0m;
    
    // Владелец
    public int? OwnerId { get; set; }
    
    // Статусы
    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;
    
    // Геолокационные данные
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("CityId")]
    public virtual City? City { get; set; }
    
    public virtual ICollection<PartnerLocation> Locations { get; set; } = new List<PartnerLocation>();
    public virtual ICollection<PartnerEmployee> Employees { get; set; } = new List<PartnerEmployee>();
    public virtual ICollection<PartnerProduct> Products { get; set; } = new List<PartnerProduct>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
