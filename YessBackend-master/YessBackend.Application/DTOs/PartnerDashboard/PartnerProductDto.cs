using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.PartnerDashboard;

/// <summary>
/// Продукт партнера для дашборда
/// </summary>
public class PartnerProductDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [JsonPropertyName("price")]
    public decimal Price { get; set; }
    
    [JsonPropertyName("discount_price")]
    public decimal? DiscountPrice { get; set; }
    
    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("is_featured")]
    public bool IsFeatured { get; set; }
    
    [JsonPropertyName("stock_quantity")]
    public int? StockQuantity { get; set; }
    
    [JsonPropertyName("sku")]
    public string? Sku { get; set; }
    
    [JsonPropertyName("sales_count")]
    public int SalesCount { get; set; }
    
    [JsonPropertyName("total_revenue")]
    public decimal TotalRevenue { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Запрос на создание/обновление продукта
/// </summary>
public class PartnerProductRequestDto
{
    [JsonPropertyName("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("category")]
    [MaxLength(100)]
    public string? Category { get; set; }
    
    [JsonPropertyName("price")]
    [Required]
    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }
    
    [JsonPropertyName("discount_price")]
    [Range(0, double.MaxValue)]
    public decimal? DiscountPrice { get; set; }
    
    [JsonPropertyName("image_url")]
    [Url]
    public string? ImageUrl { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
    
    [JsonPropertyName("is_featured")]
    public bool IsFeatured { get; set; }
    
    [JsonPropertyName("stock_quantity")]
    public int? StockQuantity { get; set; }
    
    [JsonPropertyName("sku")]
    [MaxLength(50)]
    public string? Sku { get; set; }
}

/// <summary>
/// Локация партнера для дашборда
/// </summary>
public class PartnerLocationDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;
    
    [JsonPropertyName("city")]
    public string? City { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("latitude")]
    public double? Latitude { get; set; }
    
    [JsonPropertyName("longitude")]
    public double? Longitude { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("working_hours")]
    public string? WorkingHours { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int OrdersCount { get; set; }
    
    [JsonPropertyName("total_revenue")]
    public decimal TotalRevenue { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Сотрудник партнера
/// </summary>
public class PartnerEmployeeDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("role")]
    public string Role { get; set; } = "employee";
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
    
    [JsonPropertyName("location_name")]
    public string? LocationName { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Запрос на добавление сотрудника
/// </summary>
public class AddEmployeeRequestDto
{
    [JsonPropertyName("user_id")]
    public int? UserId { get; set; }
    
    [JsonPropertyName("phone")]
    [Phone]
    public string? Phone { get; set; }
    
    [JsonPropertyName("email")]
    [EmailAddress]
    public string? Email { get; set; }
    
    [JsonPropertyName("role")]
    public string Role { get; set; } = "employee";
    
    [JsonPropertyName("location_id")]
    public int? LocationId { get; set; }
}

