using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Сотрудники партнеров
/// Соответствует таблице partner_employees в PostgreSQL
/// </summary>
public class PartnerEmployee
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int PartnerId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [MaxLength(100)]
    public string? Position { get; set; }
    
    [MaxLength(50)]
    public string? Role { get; set; } = "employee"; // owner, manager, cashier, employee
    
    public int? LocationId { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime HiredAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("PartnerId")]
    public virtual Partner Partner { get; set; } = null!;
    
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    [ForeignKey("LocationId")]
    public virtual PartnerLocation? Location { get; set; }
}
