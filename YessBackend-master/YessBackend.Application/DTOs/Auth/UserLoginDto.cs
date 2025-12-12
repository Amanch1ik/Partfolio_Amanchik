using System.ComponentModel.DataAnnotations;

namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для входа пользователя
/// Соответствует LoginRequest из Python API
/// </summary>
public class UserLoginDto
{
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}
