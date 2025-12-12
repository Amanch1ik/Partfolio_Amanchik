using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.QR;

/// <summary>
/// DTO для запроса оплаты через QR код
/// </summary>
public class QRPaymentRequestDto
{
    [JsonPropertyName("partner_id")]
    [Required]
    public int PartnerId { get; set; }

    [JsonPropertyName("amount")]
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Сумма должна быть больше 0")]
    public decimal Amount { get; set; }

    [JsonPropertyName("qr_data")]
    public string? QrData { get; set; }
}

/// <summary>
/// DTO для ответа оплаты через QR код
/// </summary>
public class QRPaymentResponseDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("transaction_id")]
    public int TransactionId { get; set; }

    [JsonPropertyName("amount_charged")]
    public decimal AmountCharged { get; set; }

    [JsonPropertyName("discount_applied")]
    public decimal DiscountApplied { get; set; }

    [JsonPropertyName("cashback_earned")]
    public decimal CashbackEarned { get; set; }

    [JsonPropertyName("new_balance")]
    public decimal NewBalance { get; set; }

    [JsonPropertyName("partner_name")]
    public string PartnerName { get; set; } = string.Empty;
}

/// <summary>
/// DTO для ответа генерации QR кода
/// </summary>
public class QRGenerateResponseDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("partner_id")]
    public int PartnerId { get; set; }

    [JsonPropertyName("qr_code_url")]
    public string QrCodeUrl { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

