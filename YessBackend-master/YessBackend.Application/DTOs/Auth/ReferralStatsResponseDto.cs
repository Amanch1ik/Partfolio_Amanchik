using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Auth;

/// <summary>
/// DTO для статистики реферальной программы
/// </summary>
public class ReferralStatsResponseDto
{
    [JsonPropertyName("total_referred")]
    public int TotalReferred { get; set; }

    [JsonPropertyName("active_referred")]
    public int ActiveReferred { get; set; }

    [JsonPropertyName("referral_code")]
    public string? ReferralCode { get; set; }
}

