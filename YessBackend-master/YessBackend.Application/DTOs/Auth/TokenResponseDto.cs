namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для ответа с токенами
/// Соответствует TokenResponse из Python API
/// </summary>
public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public int ExpiresIn { get; set; }
}
