using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.PartnerDashboard;

/// <summary>
/// Профиль текущего партнера
/// </summary>
public class PartnerProfileDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }
    
    [JsonPropertyName("role")]
    public string Role { get; set; } = "partner";
    
    [JsonPropertyName("partner_id")]
    public int PartnerId { get; set; }
    
    [JsonPropertyName("partner_name")]
    public string PartnerName { get; set; } = string.Empty;
    
    [JsonPropertyName("partner_logo_url")]
    public string? PartnerLogoUrl { get; set; }
    
    [JsonPropertyName("is_owner")]
    public bool IsOwner { get; set; }
    
    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new();
}

/// <summary>
/// Статистика партнера
/// </summary>
public class PartnerStatsDto
{
    [JsonPropertyName("partner_id")]
    public int PartnerId { get; set; }
    
    [JsonPropertyName("partner_name")]
    public string PartnerName { get; set; } = string.Empty;
    
    // Заказы
    [JsonPropertyName("total_orders")]
    public int TotalOrders { get; set; }
    
    [JsonPropertyName("pending_orders")]
    public int PendingOrders { get; set; }
    
    [JsonPropertyName("completed_orders")]
    public int CompletedOrders { get; set; }
    
    [JsonPropertyName("cancelled_orders")]
    public int CancelledOrders { get; set; }
    
    [JsonPropertyName("orders_today")]
    public int OrdersToday { get; set; }
    
    [JsonPropertyName("orders_this_week")]
    public int OrdersThisWeek { get; set; }
    
    [JsonPropertyName("orders_this_month")]
    public int OrdersThisMonth { get; set; }
    
    // Транзакции
    [JsonPropertyName("total_transactions")]
    public int TotalTransactions { get; set; }
    
    [JsonPropertyName("transactions_today")]
    public int TransactionsToday { get; set; }
    
    // Выручка
    [JsonPropertyName("total_revenue")]
    public decimal TotalRevenue { get; set; }
    
    [JsonPropertyName("revenue_today")]
    public decimal RevenueToday { get; set; }
    
    [JsonPropertyName("revenue_this_week")]
    public decimal RevenueThisWeek { get; set; }
    
    [JsonPropertyName("revenue_this_month")]
    public decimal RevenueThisMonth { get; set; }
    
    [JsonPropertyName("revenue_growth_percent")]
    public decimal RevenueGrowthPercent { get; set; }
    
    // Средний чек
    [JsonPropertyName("average_order_value")]
    public decimal AverageOrderValue { get; set; }
    
    // Клиенты
    [JsonPropertyName("unique_customers")]
    public int UniqueCustomers { get; set; }
    
    [JsonPropertyName("new_customers_this_month")]
    public int NewCustomersThisMonth { get; set; }
    
    [JsonPropertyName("returning_customers")]
    public int ReturningCustomers { get; set; }
    
    // Продукты
    [JsonPropertyName("products_count")]
    public int ProductsCount { get; set; }
    
    [JsonPropertyName("active_products")]
    public int ActiveProducts { get; set; }
    
    // Локации
    [JsonPropertyName("locations_count")]
    public int LocationsCount { get; set; }
    
    // Сотрудники
    [JsonPropertyName("employees_count")]
    public int EmployeesCount { get; set; }
    
    // Кэшбэк
    [JsonPropertyName("total_cashback_given")]
    public decimal TotalCashbackGiven { get; set; }
    
    [JsonPropertyName("cashback_rate")]
    public decimal CashbackRate { get; set; }
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Графики для дашборда партнера
/// </summary>
public class PartnerChartsDto
{
    [JsonPropertyName("revenue_chart")]
    public List<PartnerChartDataPointDto> RevenueChart { get; set; } = new();
    
    [JsonPropertyName("orders_chart")]
    public List<PartnerChartDataPointDto> OrdersChart { get; set; } = new();
    
    [JsonPropertyName("customers_chart")]
    public List<PartnerChartDataPointDto> CustomersChart { get; set; } = new();
    
    [JsonPropertyName("top_products")]
    public List<TopProductDto> TopProducts { get; set; } = new();
    
    [JsonPropertyName("orders_by_status")]
    public List<StatusChartDto> OrdersByStatus { get; set; } = new();
    
    [JsonPropertyName("revenue_by_location")]
    public List<LocationRevenueDto> RevenueByLocation { get; set; } = new();
}

public class PartnerChartDataPointDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;
    
    [JsonPropertyName("value")]
    public decimal Value { get; set; }
    
    [JsonPropertyName("label")]
    public string? Label { get; set; }
}

public class TopProductDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("sales_count")]
    public int SalesCount { get; set; }
    
    [JsonPropertyName("revenue")]
    public decimal Revenue { get; set; }
    
    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }
}

public class StatusChartDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("count")]
    public int Count { get; set; }
    
    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

public class LocationRevenueDto
{
    [JsonPropertyName("location_id")]
    public int LocationId { get; set; }
    
    [JsonPropertyName("location_name")]
    public string LocationName { get; set; } = string.Empty;
    
    [JsonPropertyName("address")]
    public string? Address { get; set; }
    
    [JsonPropertyName("revenue")]
    public decimal Revenue { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int OrdersCount { get; set; }
}

