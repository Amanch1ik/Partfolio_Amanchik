using System.ComponentModel.DataAnnotations;

namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для регистрации пользователя
/// Соответствует UserCreate из Python API
/// </summary>
public class UserRegisterDto
{
    [Required]
    public string PhoneNumber { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
    
    [Required]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    public string LastName { get; set; } = string.Empty;
    
    public int? CityId { get; set; }
    
    public string? ReferralCode { get; set; }
}
