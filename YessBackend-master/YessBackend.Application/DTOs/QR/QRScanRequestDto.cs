using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.QR;

/// <summary>
/// DTO для запроса сканирования QR кода
/// </summary>
public class QRScanRequestDto
{
    [JsonPropertyName("qr_data")]
    [Required]
    public string QrData { get; set; } = string.Empty;
}

/// <summary>
/// DTO для ответа сканирования QR кода
/// </summary>
public class QRScanResponseDto
{
    [JsonPropertyName("partner_id")]
    public int PartnerId { get; set; }

    [JsonPropertyName("partner_name")]
    public string PartnerName { get; set; } = string.Empty;

    [JsonPropertyName("partner_category")]
    public string PartnerCategory { get; set; } = string.Empty;

    [JsonPropertyName("partner_logo")]
    public string? PartnerLogo { get; set; }

    [JsonPropertyName("max_discount")]
    public decimal MaxDiscount { get; set; }

    [JsonPropertyName("cashback_rate")]
    public decimal CashbackRate { get; set; }

    [JsonPropertyName("user_balance")]
    public decimal UserBalance { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

