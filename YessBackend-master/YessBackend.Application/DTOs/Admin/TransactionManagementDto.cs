using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Транзакция для админ-панели
/// </summary>
public class AdminTransactionDto
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
    public int? PartnerId { get; set; }
    
    [JsonPropertyName("partner_name")]
    public string? PartnerName { get; set; }
    
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }
    
    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// Фильтр для списка транзакций
/// </summary>
public class TransactionFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("user_id")]
    public int? UserId { get; set; }
    
    [JsonPropertyName("partner_id")]
    public int? PartnerId { get; set; }
    
    [JsonPropertyName("type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
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
/// Запрос на обновление статуса транзакции
/// </summary>
public class UpdateTransactionStatusDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

