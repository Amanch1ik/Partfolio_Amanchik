using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Заказ для админ-панели
/// </summary>
public class AdminOrderDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("user_phone")]
    public string? UserPhone { get; set; }
    
    [JsonPropertyName("partner_id")]
    public int PartnerId { get; set; }
    
    [JsonPropertyName("partner_name")]
    public string? PartnerName { get; set; }
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("location_address")]
    public string? LocationAddress { get; set; }
    
    [JsonPropertyName("original_amount")]
    public decimal OriginalAmount { get; set; }
    
    [JsonPropertyName("discount_amount")]
    public decimal DiscountAmount { get; set; }
    
    [JsonPropertyName("cashback_amount")]
    public decimal CashbackAmount { get; set; }
    
    [JsonPropertyName("final_amount")]
    public decimal FinalAmount { get; set; }
    
    [JsonPropertyName("yescoin_used")]
    public decimal YescoinUsed { get; set; }
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("payment_method")]
    public string? PaymentMethod { get; set; }
    
    [JsonPropertyName("payment_status")]
    public string? PaymentStatus { get; set; }
    
    [JsonPropertyName("items_count")]
    public int ItemsCount { get; set; }
    
    [JsonPropertyName("items")]
    public List<AdminOrderItemDto> Items { get; set; } = new();
    
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
    
    [JsonPropertyName("idempotency_key")]
    public string? IdempotencyKey { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
    
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// Элемент заказа для админ-панели
/// </summary>
public class AdminOrderItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("product_id")]
    public int? ProductId { get; set; }
    
    [JsonPropertyName("product_name")]
    public string ProductName { get; set; } = string.Empty;
    
    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }
    
    [JsonPropertyName("unit_price")]
    public decimal UnitPrice { get; set; }
    
    [JsonPropertyName("total_price")]
    public decimal TotalPrice { get; set; }
}

/// <summary>
/// Фильтр для списка заказов
/// </summary>
public class OrderFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("user_id")]
    public int? UserId { get; set; }
    
    [JsonPropertyName("partner_id")]
    public int? PartnerId { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("payment_status")]
    public string? PaymentStatus { get; set; }
    
    [JsonPropertyName("min_amount")]
    public decimal? MinAmount { get; set; }
    
    [JsonPropertyName("max_amount")]
    public decimal? MaxAmount { get; set; }
    
    [JsonPropertyName("created_from")]
    public DateTime? CreatedFrom { get; set; }
    
    [JsonPropertyName("created_to")]
    public DateTime? CreatedTo { get; set; }
    
    [JsonPropertyName("sort_by")]
    public string SortBy { get; set; } = "created_at";
    
    [JsonPropertyName("sort_desc")]
    public bool SortDesc { get; set; } = true;
}

/// <summary>
/// Запрос на обновление статуса заказа
/// </summary>
public class UpdateOrderStatusDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

