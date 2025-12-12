using System.Text.Json.Serialization;

namespace YessGoFront.Models;

/// <summary>
/// Обёртка для ответа API с баннерами
/// </summary>
public class BannerResponse
{
    [JsonPropertyName("items")]
    public List<BannerDto> Items { get; set; } = new();
    
    [JsonPropertyName("total")]
    public int Total { get; set; }
}

public class BannerDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;
    
    [JsonPropertyName("partnerId")]
    public int? PartnerId { get; set; }
    
    [JsonPropertyName("partnerName")]
    public string? PartnerName { get; set; }
    
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    
    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
    
    [JsonPropertyName("order")]
    public int Order { get; set; } = 0;
}

