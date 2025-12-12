using System.Text.Json.Serialization;
using YessGoFront.Models;

namespace YessGoFront.Services.Api;

/// <summary>
/// API сервис для аутентификации
/// </summary>
public interface IAuthApiService
{
    /// <summary>
    /// Логин
    /// </summary>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);

    /// <summary>
    /// Выход
    /// </summary>
    Task LogoutAsync(CancellationToken ct = default);

    /// <summary>
    /// Верификация кода
    /// </summary>
    Task<AuthResponse> VerifyCodeAsync(string code, CancellationToken ct = default);

    /// <summary>
    /// Отправка SMS-кода верификации на номер телефона
    /// </summary>
    Task<Dictionary<string, object>> SendVerificationCodeAsync(string phoneNumber, CancellationToken ct = default);

    /// <summary>
    /// Проверка кода и завершение регистрации
    /// </summary>
    Task<UserDto> VerifyCodeAndRegisterAsync(VerifyCodeRequest request, CancellationToken ct = default);

    /// <summary>
    /// Получение профиля текущего пользователя
    /// </summary>
    Task<UserDto> GetMeAsync(CancellationToken ct = default);
}

/// <summary>
/// Запрос на логин
/// Поддерживает вход по Email или Phone
/// </summary>
public class LoginRequest
{
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Определяет, что использовать для логина (Email или Phone)
    /// </summary>
    public string Username => !string.IsNullOrWhiteSpace(Phone) ? Phone : Email ?? string.Empty;
    
    /// <summary>
    /// Валидация: должен быть указан либо Email, либо Phone
    /// </summary>
    public bool IsValid => (!string.IsNullOrWhiteSpace(Email) || !string.IsNullOrWhiteSpace(Phone)) 
                           && !string.IsNullOrWhiteSpace(Password);
}

/// <summary>
/// Payload for requesting an SMS verification code.
/// </summary>
public class VerificationCodeRequest
{
    public string phone_number { get; set; } = string.Empty;
}

/// <summary>
/// Запрос на проверку кода и регистрацию
/// </summary>
public class VerifyCodeRequest
{
    public string phone_number { get; set; } = string.Empty;
    public string code { get; set; } = string.Empty;
    public string password { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public string last_name { get; set; } = string.Empty;
    public int? city_id { get; set; }
    public string? referral_code { get; set; }
}


/// <summary>
/// Ответ на аутентификацию
/// Соответствует TokenResponse схеме бэкенда
/// </summary>
public class AuthResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;
    
    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;
    
    [JsonPropertyName("token_type")]
    public string TokenType { get; set; } = "bearer";
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    /// <summary>
    /// Данные пользователя (могут быть в отдельном запросе /me)
    /// </summary>
    [JsonPropertyName("user")]
    public UserDto? User { get; set; }
}

