using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Обобщенный ответ с пагинацией
/// </summary>
/// <typeparam name="T">Тип элементов</typeparam>
public class PaginatedResponseDto<T>
{
    [JsonPropertyName("items")]
    public List<T> Items { get; set; } = new();
    
    [JsonPropertyName("total")]
    public int Total { get; set; }
    
    [JsonPropertyName("page")]
    public int Page { get; set; }
    
    [JsonPropertyName("page_size")]
    public int PageSize { get; set; }
    
    [JsonPropertyName("total_pages")]
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
    
    [JsonPropertyName("has_next")]
    public bool HasNext => Page < TotalPages;
    
    [JsonPropertyName("has_previous")]
    public bool HasPrevious => Page > 1;
}

/// <summary>
/// Параметры пагинации
/// </summary>
public class PaginationParams
{
    private int _page = 1;
    private int _pageSize = 20;
    private const int MaxPageSize = 100;
    
    [JsonPropertyName("page")]
    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }
    
    [JsonPropertyName("page_size")]
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : value < 1 ? 1 : value;
    }
    
    public int Skip => (Page - 1) * PageSize;
}

/// <summary>
/// Профиль текущего администратора
/// </summary>
public class AdminProfileDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }
    
    [JsonPropertyName("role")]
    public string Role { get; set; } = "admin";
    
    [JsonPropertyName("roles")]
    public List<string> Roles { get; set; } = new();
    
    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new();
    
    [JsonPropertyName("last_login_at")]
    public DateTime? LastLoginAt { get; set; }
}

/// <summary>
/// Город
/// </summary>
public class CityDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("users_count")]
    public int UsersCount { get; set; }
    
    [JsonPropertyName("partners_count")]
    public int PartnersCount { get; set; }
}

/// <summary>
/// Запрос на создание города
/// </summary>
public class CreateCityRequestDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Уведомление для админ-панели
/// </summary>
public class AdminNotificationDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("message")]
    public string? Message { get; set; }
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("is_read")]
    public bool IsRead { get; set; }
    
    [JsonPropertyName("data")]
    public Dictionary<string, object>? Data { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("read_at")]
    public DateTime? ReadAt { get; set; }
}

/// <summary>
/// Запрос на массовую рассылку уведомлений
/// </summary>
public class BroadcastNotificationRequestDto
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = "info";
    
    [JsonPropertyName("target")]
    public string Target { get; set; } = "all"; // "all", "users", "partners", "specific"
    
    [JsonPropertyName("user_ids")]
    public List<int>? UserIds { get; set; }
    
    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }
}

/// <summary>
/// Кошелек для админ-панели
/// </summary>
public class AdminWalletDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("user_phone")]
    public string? UserPhone { get; set; }
    
    [JsonPropertyName("balance")]
    public decimal Balance { get; set; }
    
    [JsonPropertyName("yescoin_balance")]
    public decimal YescoinBalance { get; set; }
    
    [JsonPropertyName("total_earned")]
    public decimal TotalEarned { get; set; }
    
    [JsonPropertyName("total_spent")]
    public decimal TotalSpent { get; set; }
    
    [JsonPropertyName("last_updated")]
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Результат операции
/// </summary>
public class OperationResultDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
    
    [JsonPropertyName("data")]
    public object? Data { get; set; }
    
    public static OperationResultDto Ok(string message = "Операция выполнена успешно", object? data = null)
        => new() { Success = true, Message = message, Data = data };
    
    public static OperationResultDto Error(string message)
        => new() { Success = false, Message = message };
}

/// <summary>
/// Журнал действий администратора
/// </summary>
public class AdminAuditLogDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("admin_id")]
    public int AdminId { get; set; }
    
    [JsonPropertyName("admin_name")]
    public string? AdminName { get; set; }
    
    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;
    
    [JsonPropertyName("entity_type")]
    public string? EntityType { get; set; }
    
    [JsonPropertyName("entity_id")]
    public int? EntityId { get; set; }
    
    [JsonPropertyName("old_values")]
    public Dictionary<string, object>? OldValues { get; set; }
    
    [JsonPropertyName("new_values")]
    public Dictionary<string, object>? NewValues { get; set; }
    
    [JsonPropertyName("ip_address")]
    public string? IpAddress { get; set; }
    
    [JsonPropertyName("user_agent")]
    public string? UserAgent { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

