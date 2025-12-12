using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.PartnerProduct;

/// <summary>
/// DTO для создания товара партнера
/// </summary>
public class PartnerProductCreateDto
{
    [JsonPropertyName("name")]
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("name_kg")]
    [MaxLength(200)]
    public string? NameKg { get; set; }

    [JsonPropertyName("name_ru")]
    [MaxLength(200)]
    public string? NameRu { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("price")]
    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [JsonPropertyName("category")]
    [MaxLength(50)]
    public string? Category { get; set; }

    [JsonPropertyName("image_url")]
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("images")]
    public List<string>? Images { get; set; }

    [JsonPropertyName("is_available")]
    public bool IsAvailable { get; set; } = true;

    [JsonPropertyName("stock_quantity")]
    [Range(0, int.MaxValue)]
    public int? StockQuantity { get; set; }

    [JsonPropertyName("sku")]
    [MaxLength(100)]
    public string? Sku { get; set; }

    [JsonPropertyName("discount_percent")]
    [Range(0, 100)]
    public decimal DiscountPercent { get; set; } = 0;

    [JsonPropertyName("original_price")]
    [Range(0, double.MaxValue)]
    public decimal? OriginalPrice { get; set; }

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; } = 0;
}

/// <summary>
/// DTO для обновления товара партнера
/// </summary>
public class PartnerProductUpdateDto
{
    [JsonPropertyName("name")]
    [MaxLength(200)]
    public string? Name { get; set; }

    [JsonPropertyName("name_kg")]
    [MaxLength(200)]
    public string? NameKg { get; set; }

    [JsonPropertyName("name_ru")]
    [MaxLength(200)]
    public string? NameRu { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("price")]
    [Range(0, double.MaxValue)]
    public decimal? Price { get; set; }

    [JsonPropertyName("category")]
    [MaxLength(50)]
    public string? Category { get; set; }

    [JsonPropertyName("image_url")]
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("images")]
    public List<string>? Images { get; set; }

    [JsonPropertyName("is_available")]
    public bool? IsAvailable { get; set; }

    [JsonPropertyName("stock_quantity")]
    [Range(0, int.MaxValue)]
    public int? StockQuantity { get; set; }

    [JsonPropertyName("sku")]
    [MaxLength(100)]
    public string? Sku { get; set; }

    [JsonPropertyName("discount_percent")]
    [Range(0, 100)]
    public decimal? DiscountPercent { get; set; }

    [JsonPropertyName("original_price")]
    [Range(0, double.MaxValue)]
    public decimal? OriginalPrice { get; set; }

    [JsonPropertyName("sort_order")]
    public int? SortOrder { get; set; }
}

