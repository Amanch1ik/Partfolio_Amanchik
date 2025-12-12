using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Wallet;

/// <summary>
/// DTO для запроса пополнения кошелька
/// </summary>
public class TopUpRequestDto
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }
}

/// <summary>
/// DTO для ответа пополнения кошелька
/// </summary>
public class TopUpResponseDto
{
    [JsonPropertyName("transaction_id")]
    public int TransactionId { get; set; }

    [JsonPropertyName("payment_url")]
    public string PaymentUrl { get; set; } = string.Empty;

    [JsonPropertyName("qr_code_data")]
    public string QrCodeData { get; set; } = string.Empty;
}

