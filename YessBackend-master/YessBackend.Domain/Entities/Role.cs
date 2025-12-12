using System.ComponentModel.DataAnnotations;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Роли пользователей
/// Соответствует таблице roles в PostgreSQL
/// </summary>
public class Role
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty; // admin, partner, agent, user
    
    [MaxLength(100)]
    public string? Title { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string? Description { get; set; }
    
    // Navigation properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
