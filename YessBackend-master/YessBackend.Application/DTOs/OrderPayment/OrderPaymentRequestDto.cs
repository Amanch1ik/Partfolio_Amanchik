using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.OrderPayment;

/// <summary>
/// Метод оплаты
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentMethod
{
    wallet,
    card,
    bank,
    qr
}

/// <summary>
/// DTO для запроса создания платежа заказа
/// </summary>
public class OrderPaymentRequestDto
{
    [JsonPropertyName("method")]
    [Required]
    public PaymentMethod Method { get; set; }
}

/// <summary>
/// Статус платежа
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentStatus
{
    pending,
    processing,
    success,
    failed,
    cancelled
}

/// <summary>
/// DTO для ответа с информацией о платеже
/// </summary>
public class PaymentResponseDto
{
    [JsonPropertyName("payment_id")]
    public int? PaymentId { get; set; }

    [JsonPropertyName("transaction_id")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("order_id")]
    public int OrderId { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "processing";

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("commission")]
    public decimal Commission { get; set; }

    [JsonPropertyName("redirect_url")]
    public string? RedirectUrl { get; set; }

    [JsonPropertyName("payment_url")]
    public string? PaymentUrl { get; set; }

    [JsonPropertyName("qr_code")]
    public string? QrCode { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "Платеж создан";
}

/// <summary>
/// DTO для статуса платежа заказа
/// </summary>
public class PaymentStatusResponseDto
{
    [JsonPropertyName("order_id")]
    public int OrderId { get; set; }

    [JsonPropertyName("payment_status")]
    public string PaymentStatus { get; set; } = string.Empty;

    [JsonPropertyName("order_status")]
    public string OrderStatus { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("paid_at")]
    public DateTime? PaidAt { get; set; }
}

