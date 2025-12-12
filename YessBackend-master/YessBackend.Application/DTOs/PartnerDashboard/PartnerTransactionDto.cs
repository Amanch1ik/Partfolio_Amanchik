using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.PartnerDashboard;

/// <summary>
/// Транзакция партнера
/// </summary>
public class PartnerTransactionDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("user_phone")]
    public string? UserPhone { get; set; }
    
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("location_name")]
    public string? LocationName { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// Заказ партнера
/// </summary>
public class PartnerOrderDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("user_phone")]
    public string? UserPhone { get; set; }
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("location_name")]
    public string? LocationName { get; set; }
    
    [JsonPropertyName("original_amount")]
    public decimal OriginalAmount { get; set; }
    
    [JsonPropertyName("discount_amount")]
    public decimal DiscountAmount { get; set; }
    
    [JsonPropertyName("cashback_amount")]
    public decimal CashbackAmount { get; set; }
    
    [JsonPropertyName("final_amount")]
    public decimal FinalAmount { get; set; }
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("payment_status")]
    public string? PaymentStatus { get; set; }
    
    [JsonPropertyName("items_count")]
    public int ItemsCount { get; set; }
    
    [JsonPropertyName("items")]
    public List<PartnerOrderItemDto> Items { get; set; } = new();
    
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }
}

public class PartnerOrderItemDto
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
/// Фильтр для списка транзакций партнера
/// </summary>
public class PartnerTransactionFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("min_amount")]
    public decimal? MinAmount { get; set; }
    
    [JsonPropertyName("max_amount")]
    public decimal? MaxAmount { get; set; }
    
    [JsonPropertyName("date_from")]
    public DateTime? DateFrom { get; set; }
    
    [JsonPropertyName("date_to")]
    public DateTime? DateTo { get; set; }
    
    [JsonPropertyName("sort_by")]
    public string SortBy { get; set; } = "created_at";
    
    [JsonPropertyName("sort_desc")]
    public bool SortDesc { get; set; } = true;
}

/// <summary>
/// Фильтр для списка заказов партнера
/// </summary>
public class PartnerOrderFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("payment_status")]
    public string? PaymentStatus { get; set; }
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("min_amount")]
    public decimal? MinAmount { get; set; }
    
    [JsonPropertyName("max_amount")]
    public decimal? MaxAmount { get; set; }
    
    [JsonPropertyName("date_from")]
    public DateTime? DateFrom { get; set; }
    
    [JsonPropertyName("date_to")]
    public DateTime? DateTo { get; set; }
    
    [JsonPropertyName("sort_by")]
    public string SortBy { get; set; } = "created_at";
    
    [JsonPropertyName("sort_desc")]
    public bool SortDesc { get; set; } = true;
}

/// <summary>
/// Пагинированный ответ для партнера
/// </summary>
public class PartnerPaginatedResponseDto<T>
{
    [JsonPropertyName("items")]
    public List<T> Items { get; set; } = new();
    
    [JsonPropertyName("total")]
    public int Total { get; set; }
    
    [JsonPropertyName("limit")]
    public int Limit { get; set; }
    
    [JsonPropertyName("offset")]
    public int Offset { get; set; }
    
    [JsonPropertyName("has_more")]
    public bool HasMore => Offset + Items.Count < Total;
}

