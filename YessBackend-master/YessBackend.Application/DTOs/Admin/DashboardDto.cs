using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Admin;

/// <summary>
/// Статистика дашборда администратора
/// </summary>
public class DashboardStatsDto
{
    [JsonPropertyName("total_users")]
    public int TotalUsers { get; set; }
    
    [JsonPropertyName("active_users")]
    public int ActiveUsers { get; set; }
    
    [JsonPropertyName("new_users_today")]
    public int NewUsersToday { get; set; }
    
    [JsonPropertyName("new_users_this_week")]
    public int NewUsersThisWeek { get; set; }
    
    [JsonPropertyName("new_users_this_month")]
    public int NewUsersThisMonth { get; set; }
    
    [JsonPropertyName("total_partners")]
    public int TotalPartners { get; set; }
    
    [JsonPropertyName("active_partners")]
    public int ActivePartners { get; set; }
    
    [JsonPropertyName("verified_partners")]
    public int VerifiedPartners { get; set; }
    
    [JsonPropertyName("total_transactions")]
    public int TotalTransactions { get; set; }
    
    [JsonPropertyName("total_orders")]
    public int TotalOrders { get; set; }
    
    [JsonPropertyName("pending_orders")]
    public int PendingOrders { get; set; }
    
    [JsonPropertyName("completed_orders")]
    public int CompletedOrders { get; set; }
    
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
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Статистика транзакций
/// </summary>
public class TransactionStatsDto
{
    [JsonPropertyName("total")]
    public int Total { get; set; }
    
    [JsonPropertyName("completed")]
    public int Completed { get; set; }
    
    [JsonPropertyName("pending")]
    public int Pending { get; set; }
    
    [JsonPropertyName("failed")]
    public int Failed { get; set; }
    
    [JsonPropertyName("cancelled")]
    public int Cancelled { get; set; }
    
    [JsonPropertyName("total_amount")]
    public decimal TotalAmount { get; set; }
    
    [JsonPropertyName("average_amount")]
    public decimal AverageAmount { get; set; }
    
    [JsonPropertyName("period_start")]
    public DateTime? PeriodStart { get; set; }
    
    [JsonPropertyName("period_end")]
    public DateTime? PeriodEnd { get; set; }
}

/// <summary>
/// Графики для дашборда
/// </summary>
public class DashboardChartsDto
{
    [JsonPropertyName("revenue_chart")]
    public List<ChartDataPointDto> RevenueChart { get; set; } = new();
    
    [JsonPropertyName("users_chart")]
    public List<ChartDataPointDto> UsersChart { get; set; } = new();
    
    [JsonPropertyName("orders_chart")]
    public List<ChartDataPointDto> OrdersChart { get; set; } = new();
    
    [JsonPropertyName("transactions_by_status")]
    public List<PieChartDataDto> TransactionsByStatus { get; set; } = new();
    
    [JsonPropertyName("partners_by_category")]
    public List<PieChartDataDto> PartnersByCategory { get; set; } = new();
}

public class ChartDataPointDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;
    
    [JsonPropertyName("value")]
    public decimal Value { get; set; }
}

public class PieChartDataDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("value")]
    public int Value { get; set; }
    
    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

