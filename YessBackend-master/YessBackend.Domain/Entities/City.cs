using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Города Кыргызстана
/// Соответствует таблице cities в PostgreSQL
/// </summary>
public class City
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? NameKg { get; set; }
    
    [MaxLength(100)]
    public string? NameRu { get; set; }
    
    [MaxLength(100)]
    public string? NameEn { get; set; }
    
    [MaxLength(100)]
    public string? Region { get; set; }
    
    [Column(TypeName = "decimal(10,8)")]
    public decimal? Latitude { get; set; }
    
    [Column(TypeName = "decimal(11,8)")]
    public decimal? Longitude { get; set; }
    
    public int? Population { get; set; }
    
    public bool IsCapital { get; set; } = false;
    
    // Navigation properties
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    public virtual ICollection<Partner> Partners { get; set; } = new List<Partner>();
}
