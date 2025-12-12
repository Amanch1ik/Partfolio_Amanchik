using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для запроса проверки кода верификации и регистрации
/// </summary>
public class VerifyCodeAndRegisterRequestDto
{
    [JsonPropertyName("phone_number")]
    public string PhoneNumber { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("last_name")]
    public string LastName { get; set; } = string.Empty;

    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }

    [JsonPropertyName("referral_code")]
    public string? ReferralCode { get; set; }
}

