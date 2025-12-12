namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для ответа с данными пользователя
/// Соответствует UserResponse из Python API
/// </summary>
public class UserResponseDto
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool PhoneVerified { get; set; }
    public bool EmailVerified { get; set; }
    public int? CityId { get; set; }
    public string? ReferralCode { get; set; }
    public DateTime CreatedAt { get; set; }
}
