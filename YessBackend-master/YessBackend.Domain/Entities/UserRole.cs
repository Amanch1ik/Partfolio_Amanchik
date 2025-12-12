using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Связь пользователей с ролями
/// Соответствует таблице user_roles в PostgreSQL
/// </summary>
public class UserRole
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public int RoleId { get; set; }
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;
}
