namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса интеграций с банками (мок)
/// </summary>
public interface IBankService
{
    Task<object> GetBankListAsync();
    Task<object> GetBankInfoAsync(string bankCode);
    Task<object> CheckCardAsync(string cardNumber);
    Task<object> TransferMoneyAsync(string fromCard, string toCard, decimal amount, string description);
    Task<object> GetTransferStatusAsync(string transactionId);
    Task<object> GetBankBalanceAsync(string cardNumber);
    Task<object> GetTransactionHistoryAsync(string cardNumber, int limit = 50);
}

