using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Пользователь для админ-панели (расширенная информация)
/// </summary>
public class AdminUserDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("full_name")]
    public string FullName => $"{FirstName} {LastName}".Trim();
    
    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("city_name")]
    public string? CityName { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    
    [JsonPropertyName("is_blocked")]
    public bool IsBlocked { get; set; }
    
    [JsonPropertyName("phone_verified")]
    public bool PhoneVerified { get; set; }
    
    [JsonPropertyName("email_verified")]
    public bool EmailVerified { get; set; }
    
    [JsonPropertyName("referral_code")]
    public string? ReferralCode { get; set; }
    
    [JsonPropertyName("referred_by")]
    public int? ReferredBy { get; set; }
    
    [JsonPropertyName("wallet_balance")]
    public decimal WalletBalance { get; set; }
    
    [JsonPropertyName("yescoin_balance")]
    public decimal YescoinBalance { get; set; }
    
    [JsonPropertyName("total_spent")]
    public decimal TotalSpent { get; set; }
    
    [JsonPropertyName("total_earned")]
    public decimal TotalEarned { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int OrdersCount { get; set; }
    
    [JsonPropertyName("transactions_count")]
    public int TransactionsCount { get; set; }
    
    [JsonPropertyName("roles")]
    public List<string> Roles { get; set; } = new();
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
    
    [JsonPropertyName("last_login_at")]
    public DateTime? LastLoginAt { get; set; }
}

/// <summary>
/// Запрос на обновление пользователя
/// </summary>
public class UpdateUserRequestDto
{
    [JsonPropertyName("first_name")]
    [MaxLength(100)]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    [MaxLength(100)]
    public string? LastName { get; set; }
    
    [JsonPropertyName("email")]
    [EmailAddress]
    [MaxLength(255)]
    public string? Email { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
    
    [JsonPropertyName("is_blocked")]
    public bool? IsBlocked { get; set; }
    
    [JsonPropertyName("phone_verified")]
    public bool? PhoneVerified { get; set; }
    
    [JsonPropertyName("email_verified")]
    public bool? EmailVerified { get; set; }
}

/// <summary>
/// Запрос на создание пользователя администратором
/// </summary>
public class CreateUserRequestDto
{
    [JsonPropertyName("phone")]
    [Required]
    [Phone]
    public string Phone { get; set; } = string.Empty;
    
    [JsonPropertyName("email")]
    [EmailAddress]
    public string? Email { get; set; }
    
    [JsonPropertyName("first_name")]
    [MaxLength(100)]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    [MaxLength(100)]
    public string? LastName { get; set; }
    
    [JsonPropertyName("password")]
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("roles")]
    public List<string>? Roles { get; set; }
}

/// <summary>
/// Запрос на изменение роли пользователя
/// </summary>
public class ChangeUserRoleRequestDto
{
    [JsonPropertyName("role")]
    [Required]
    public string Role { get; set; } = string.Empty;
    
    [JsonPropertyName("action")]
    [Required]
    public string Action { get; set; } = "add"; // "add" или "remove"
}

/// <summary>
/// Фильтр для списка пользователей
/// </summary>
public class UserFilterDto
{
    [JsonPropertyName("search")]
    public string? Search { get; set; }
    
    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
    
    [JsonPropertyName("is_blocked")]
    public bool? IsBlocked { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
    
    [JsonPropertyName("role")]
    public string? Role { get; set; }
    
    [JsonPropertyName("created_from")]
    public DateTime? CreatedFrom { get; set; }
    
    [JsonPropertyName("created_to")]
    public DateTime? CreatedTo { get; set; }
    
    [JsonPropertyName("sort_by")]
    public string SortBy { get; set; } = "created_at";
    
    [JsonPropertyName("sort_desc")]
    public bool SortDesc { get; set; } = true;
}

