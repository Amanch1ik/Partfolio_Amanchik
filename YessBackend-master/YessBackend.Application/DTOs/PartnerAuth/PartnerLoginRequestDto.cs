using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.PartnerAuth;

/// <summary>
/// DTO для запроса входа партнера
/// </summary>
public class PartnerLoginRequestDto
{
    [JsonPropertyName("username")]
    [Required]
    public string Username { get; set; } = string.Empty; // phone or email

    [JsonPropertyName("password")]
    [Required]
    public string Password { get; set; } = string.Empty;
}

