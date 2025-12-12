using System.Text.Json.Serialization;

namespace YessGoFront.Models;

/// <summary>DTO для транзакций покупок.</summary>
public class PurchaseDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("partnerId")] public string PartnerId { get; set; } = string.Empty;
    [JsonPropertyName("partnerName")] public string? PartnerName { get; set; }

    [JsonPropertyName("amount")] public decimal Amount { get; set; }
    [JsonPropertyName("dateUtc")] public DateTime DateUtc { get; set; }

    [JsonPropertyName("cashbackPercent")] public double CashbackPercent { get; set; }
    [JsonPropertyName("cashbackAmount")] public decimal CashbackAmount { get; set; }  // кэшбэк
    [JsonPropertyName("yessCoins")] public decimal YessCoins { get; set; }       // бонусы, монеты

    // Properties from API
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    
    // Computed properties for UI
    public string TypeLabel => Type.ToLower() switch
    {
        "topup" => "Пополнение",
        "discount" => "Скидка",
        "bonus" => "Бонус",
        "refund" => "Возврат",
        "payment" => "Оплата",
        _ => Type
    };
    
    public string StatusLabel => Status.ToLower() switch
    {
        "pending" => "В обработке",
        "completed" => "Завершено",
        "failed" => "Ошибка",
        "processing" => "Обрабатывается",
        "cancelled" => "Отменено",
        _ => Status
    };
    
    /// <summary>
    /// Отображаемое название транзакции (PartnerName или Description или TypeLabel)
    /// </summary>
    public string DisplayName => !string.IsNullOrWhiteSpace(PartnerName) 
        ? PartnerName 
        : (!string.IsNullOrWhiteSpace(Description) 
            ? Description 
            : TypeLabel);
}
