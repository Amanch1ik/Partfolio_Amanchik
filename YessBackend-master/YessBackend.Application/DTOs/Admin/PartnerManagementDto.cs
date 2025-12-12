using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Партнер для админ-панели (расширенная информация)
/// </summary>
public class AdminPartnerDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [JsonPropertyName("logo_url")]
    public string? LogoUrl { get; set; }
    
    [JsonPropertyName("cover_image_url")]
    public string? CoverImageUrl { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("website")]
    public string? Website { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("city_name")]
    public string? CityName { get; set; }
    
    [JsonPropertyName("owner_id")]
    public int? OwnerId { get; set; }
    
    [JsonPropertyName("owner_name")]
    public string? OwnerName { get; set; }
    
    [JsonPropertyName("owner_phone")]
    public string? OwnerPhone { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("is_verified")]
    public bool IsVerified { get; set; }
    
    [JsonPropertyName("max_discount_percent")]
    public decimal MaxDiscountPercent { get; set; }
    
    [JsonPropertyName("cashback_rate")]
    public decimal CashbackRate { get; set; }
    
    [JsonPropertyName("default_cashback_rate")]
    public decimal DefaultCashbackRate { get; set; }
    
    [JsonPropertyName("bank_account")]
    public string? BankAccount { get; set; }
    
    [JsonPropertyName("locations_count")]
    public int LocationsCount { get; set; }
    
    [JsonPropertyName("products_count")]
    public int ProductsCount { get; set; }
    
    [JsonPropertyName("employees_count")]
    public int EmployeesCount { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int OrdersCount { get; set; }
    
    [JsonPropertyName("total_revenue")]
    public decimal TotalRevenue { get; set; }
    
    [JsonPropertyName("transactions_count")]
    public int TransactionsCount { get; set; }
    
    [JsonPropertyName("latitude")]
    public double? Latitude { get; set; }
    
    [JsonPropertyName("longitude")]
    public double? Longitude { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Запрос на обновление партнера
/// </summary>
public class UpdatePartnerRequestDto
{
    [JsonPropertyName("name")]
    [MaxLength(255)]
    public string? Name { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("category")]
    [MaxLength(100)]
    public string? Category { get; set; }
    
    [JsonPropertyName("phone")]
    [Phone]
    public string? Phone { get; set; }
    
    [JsonPropertyName("email")]
    [EmailAddress]
    public string? Email { get; set; }
    
    [JsonPropertyName("website")]
    [Url]
    public string? Website { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
    
    [JsonPropertyName("is_verified")]
    public bool? IsVerified { get; set; }
    
    [JsonPropertyName("max_discount_percent")]
    [Range(0, 100)]
    public decimal? MaxDiscountPercent { get; set; }
    
    [JsonPropertyName("cashback_rate")]
    [Range(0, 100)]
    public decimal? CashbackRate { get; set; }
    
    [JsonPropertyName("bank_account")]
    public string? BankAccount { get; set; }
}

/// <summary>
/// Запрос на создание партнера
/// </summary>
public class CreatePartnerRequestDto
{
    [JsonPropertyName("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("category")]
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;
    
    [JsonPropertyName("phone")]
    [Phone]
    public string? Phone { get; set; }
    
    [JsonPropertyName("email")]
    [EmailAddress]
    public string? Email { get; set; }
    
    [JsonPropertyName("website")]
    [Url]
    public string? Website { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("owner_id")]
    public int? OwnerId { get; set; }
    
    [JsonPropertyName("max_discount_percent")]
    [Range(0, 100)]
    public decimal MaxDiscountPercent { get; set; } = 10.0m;
    
    [JsonPropertyName("cashback_rate")]
    [Range(0, 100)]
    public decimal CashbackRate { get; set; } = 5.0m;
}

/// <summary>
/// Фильтр для списка партнеров
/// </summary>
public class PartnerFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
    
    [JsonPropertyName("is_verified")]
    public bool? IsVerified { get; set; }
    
    [JsonPropertyName("has_owner")]
    public bool? HasOwner { get; set; }
    
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
/// Краткая информация о партнере для списков
/// </summary>
public class PartnerSummaryDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [JsonPropertyName("logo_url")]
    public string? LogoUrl { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("is_verified")]
    public bool IsVerified { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int OrdersCount { get; set; }
    
    [JsonPropertyName("total_revenue")]
    public decimal TotalRevenue { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

