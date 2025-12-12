using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис интеграций с банками (мок)
/// </summary>
public class BankService : IBankService
{
    private readonly ILogger<BankService> _logger;

    public BankService(ILogger<BankService> logger)
    {
        _logger = logger;
    }

    public Task<object> GetBankListAsync()
    {
        // Мок-реализация
        _logger.LogInformation("Mock GetBankListAsync called");

        return Task.FromResult<object>(new
        {
            banks = new[]
            {
                new { code = "OPTIMA", name = "Оптима Банк", enabled = true },
                new { code = "DEMIR", name = "Демир Банк", enabled = true },
                new { code = "BAKAI", name = "Бакай Банк", enabled = true },
                new { code = "RSK", name = "РСК Банк", enabled = true }
            }
        });
    }

    public Task<object> GetBankInfoAsync(string bankCode)
    {
        // Мок-реализация
        _logger.LogInformation("Mock GetBankInfoAsync called: BankCode={BankCode}", bankCode);

        return Task.FromResult<object>(new
        {
            code = bankCode,
            name = $"Банк {bankCode}",
            enabled = true,
            supported_operations = new[] { "transfer", "balance", "history" }
        });
    }

    public Task<object> CheckCardAsync(string cardNumber)
    {
        // Мок-реализация
        _logger.LogInformation("Mock CheckCardAsync called: CardNumber={CardNumber}", MaskCardNumber(cardNumber));

        return Task.FromResult<object>(new
        {
            valid = true,
            bank_code = "OPTIMA",
            card_type = "debit",
            message = "Card is valid (mock)"
        });
    }

    public Task<object> TransferMoneyAsync(string fromCard, string toCard, decimal amount, string description)
    {
        // Мок-реализация
        var transactionId = Guid.NewGuid().ToString();
        _logger.LogInformation("Mock TransferMoneyAsync: From={FromCard}, To={ToCard}, Amount={Amount}, TransactionId={TransactionId}",
            MaskCardNumber(fromCard), MaskCardNumber(toCard), amount, transactionId);

        return Task.FromResult<object>(new
        {
            success = true,
            transaction_id = transactionId,
            status = "pending",
            message = "Transfer initiated (mock)"
        });
    }

    public Task<object> GetTransferStatusAsync(string transactionId)
    {
        // Мок-реализация
        _logger.LogInformation("Mock GetTransferStatusAsync: TransactionId={TransactionId}", transactionId);

        return Task.FromResult<object>(new
        {
            transaction_id = transactionId,
            status = "completed",
            completed_at = DateTime.UtcNow,
            message = "Transfer completed (mock)"
        });
    }

    public Task<object> GetBankBalanceAsync(string cardNumber)
    {
        // Мок-реализация
        _logger.LogInformation("Mock GetBankBalanceAsync: CardNumber={CardNumber}", MaskCardNumber(cardNumber));

        var random = new Random();
        var balance = random.Next(1000, 100000);

        return Task.FromResult<object>(new
        {
            card_number = MaskCardNumber(cardNumber),
            balance = balance,
            currency = "KGS",
            message = "Balance retrieved (mock)"
        });
    }

    public Task<object> GetTransactionHistoryAsync(string cardNumber, int limit = 50)
    {
        // Мок-реализация
        _logger.LogInformation("Mock GetTransactionHistoryAsync: CardNumber={CardNumber}, Limit={Limit}",
            MaskCardNumber(cardNumber), limit);

        var transactions = new List<object>();
        var random = new Random();

        for (int i = 0; i < Math.Min(limit, 10); i++)
        {
            transactions.Add(new
            {
                id = Guid.NewGuid().ToString(),
                date = DateTime.UtcNow.AddDays(-i),
                amount = random.Next(-5000, 5000),
                type = random.Next(0, 2) == 0 ? "debit" : "credit",
                description = $"Transaction {i + 1} (mock)"
            });
        }

        return Task.FromResult<object>(new
        {
            transactions = transactions,
            total = transactions.Count,
            message = "Transaction history retrieved (mock)"
        });
    }

    private string MaskCardNumber(string cardNumber)
    {
        if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 4)
        {
            return "****";
        }

        return "****" + cardNumber.Substring(cardNumber.Length - 4);
    }
}

