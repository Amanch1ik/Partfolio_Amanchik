using YessBackend.Application.DTOs.Wallet;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса кошелька
/// </summary>
public interface IWalletService
{
    Task<Wallet?> GetWalletByUserIdAsync(int userId);
    Task<decimal> GetBalanceAsync(int userId);
    Task<decimal> GetYescoinBalanceAsync(int userId);
    Task<List<Transaction>> GetUserTransactionsAsync(int userId, int limit = 50, int offset = 0);
    Task<List<Transaction>> GetTransactionHistoryAsync(int userId);
    Task<Transaction> CreateTransactionAsync(
        int userId,
        string type,
        decimal amount,
        int? partnerId = null,
        int? orderId = null,
        string? description = null);
    Task<WalletSyncResponseDto> SyncWalletAsync(WalletSyncRequestDto request);
    Task<TopUpResponseDto> TopUpWalletAsync(TopUpRequestDto request);
    Task<object> ProcessPaymentWebhookAsync(int transactionId, string status, decimal amount);
}
