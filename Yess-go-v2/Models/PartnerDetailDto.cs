using System.Text.Json.Serialization;

namespace YessGoFront.Models;

/// <summary>
/// Детальная информация о партнёре
/// </summary>
public class PartnerDetailDto
{
    [JsonPropertyName("id")] 
    public int Id { get; set; }
    
    [JsonPropertyName("name")] 
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }  // Для обратной совместимости

    [JsonPropertyName("categories")]
    public List<CategoryDto>? Categories { get; set; }

    [JsonPropertyName("logoUrl")] 
    public string? LogoUrl { get; set; }
    
    [JsonPropertyName("coverImageUrl")] 
    public string? CoverImageUrl { get; set; }

    [JsonPropertyName("address")] 
    public string? Address { get; set; }
    
    [JsonPropertyName("latitude")] 
    public double? Latitude { get; set; }
    
    [JsonPropertyName("longitude")] 
    public double? Longitude { get; set; }

    [JsonPropertyName("phone")] 
    public string? Phone { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("website")] 
    public string? Website { get; set; }

    [JsonPropertyName("default_cashback_rate")]
    public double DefaultCashbackRate { get; set; }
    
    [JsonPropertyName("cashback_rate")]
    public double? CashbackRate { get; set; }
    
    [JsonPropertyName("max_discount_percent")]
    public double? MaxDiscountPercent { get; set; }

    [JsonPropertyName("is_verified")]
    public bool IsVerified { get; set; }
    
    [JsonPropertyName("social_media")]
    public Dictionary<string, string>? SocialMedia { get; set; }
    
    [JsonPropertyName("current_promotions")]
    public List<string>? CurrentPromotions { get; set; }
}

/// <summary>
/// Категория партнёра
/// </summary>
public class CategoryDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}
