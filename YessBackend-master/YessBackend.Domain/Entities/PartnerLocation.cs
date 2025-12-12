using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Локации партнеров
/// Соответствует таблице partner_locations в PostgreSQL
/// </summary>
public class PartnerLocation
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int PartnerId { get; set; }
    
    [MaxLength(200)]
    public string? Name { get; set; }
    
    [MaxLength(500)]
    public string? Address { get; set; }
    
    [MaxLength(100)]
    public string? City { get; set; }
    
    [Column(TypeName = "double precision")]
    public double? Latitude { get; set; }
    
    [Column(TypeName = "double precision")]
    public double? Longitude { get; set; }
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(500)]
    public string? WorkingHours { get; set; }
    
    public Dictionary<string, string>? WorkingHoursJson { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsMainLocation { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("PartnerId")]
    public virtual Partner Partner { get; set; } = null!;
}
