using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Models;

namespace YessGoFront.Services.Api;

/// <summary>
/// Реализация API сервиса для работы с кошельком
/// </summary>
public class WalletApiService : ApiClient, IWalletApiService
{
    public WalletApiService(
        HttpClient httpClient,
        ILogger<WalletApiService>? logger = null)
        : base(httpClient, logger)
    {
    }

    public async Task<decimal> GetBalanceAsync(CancellationToken ct = default)
    {
        Logger?.LogDebug("Запрос баланса через endpoint: {Endpoint}", ApiEndpoints.WalletEndpoints.Balance);
        var response = await GetAsync<BalanceResponse>(ApiEndpoints.WalletEndpoints.Balance, ct);
        Logger?.LogInformation("Получен баланс: {Balance} {Currency}", response.Balance, response.Currency ?? "KGS");
        return response.Balance;
    }

    public async Task<IReadOnlyList<PurchaseDto>> GetHistoryAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var endpoint = $"{ApiEndpoints.WalletEndpoints.Transactions}?page={page}&page_size={pageSize}";
        var response = await GetAsync<TransactionHistoryResponse>(endpoint, ct);
        
        // Преобразуем TransactionHistory в PurchaseDto
        var result = response?.Transactions?.Select(t => new PurchaseDto
        {
            Id = t.Id.ToString(),
            PartnerId = t.PartnerId?.ToString() ?? string.Empty,
            PartnerName = t.PartnerName,
            Amount = t.Amount,
            Type = t.Type,
            Status = t.Status,
            CreatedAt = t.CreatedAt,
            DateUtc = t.CreatedAt,
            CashbackAmount = t.YescoinEarned ?? 0m,
            YessCoins = t.YescoinEarned ?? 0m,
            Description = t.Description
        }).ToList() ?? new List<PurchaseDto>();
        
        Logger?.LogDebug("Получено транзакций: {Count}", result.Count);
        return result;
    }
    
    private class TransactionHistoryResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("transactions")]
        public List<TransactionHistoryItem>? Transactions { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("total_count")]
        public int TotalCount { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("page")]
        public int Page { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("page_size")]
        public int PageSize { get; set; }
    }
    
    private class TransactionHistoryItem
    {
        [System.Text.Json.Serialization.JsonPropertyName("id")]
        public int Id { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("amount")]
        public decimal Amount { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("commission")]
        public decimal? Commission { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("payment_method")]
        public string? PaymentMethod { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("partner_id")]
        public int? PartnerId { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("partner_name")]
        public string? PartnerName { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("description")]
        public string? Description { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("yescoin_used")]
        public decimal? YescoinUsed { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("yescoin_earned")]
        public decimal? YescoinEarned { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("balance_before")]
        public decimal? BalanceBefore { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("balance_after")]
        public decimal? BalanceAfter { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("processed_at")]
        public DateTime? ProcessedAt { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("completed_at")]
        public DateTime? CompletedAt { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    public async Task<PurchaseDto> GetTransactionByIdAsync(
        string id,
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.TransactionEndpoints.ById(id);
        return await GetAsync<PurchaseDto>(endpoint, ct);
    }

    private class BalanceResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("balance")]
        public decimal Balance { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("currency")]
        public string? Currency { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("last_updated")]
        public DateTime? LastUpdated { get; set; }
    }
}

