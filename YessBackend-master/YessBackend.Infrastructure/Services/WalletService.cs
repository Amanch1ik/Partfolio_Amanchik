using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using YessBackend.Application.DTOs.Wallet;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис кошелька
/// Реализует логику из Python WalletService
/// </summary>
public class WalletService : IWalletService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WalletService> _logger;

    public WalletService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<WalletService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<Wallet?> GetWalletByUserIdAsync(int userId)
    {
        return await _context.Wallets
            .FirstOrDefaultAsync(w => w.UserId == userId);
    }

    public async Task<decimal> GetBalanceAsync(int userId)
    {
        var wallet = await GetWalletByUserIdAsync(userId);
        return wallet?.Balance ?? 0.0m;
    }

    public async Task<decimal> GetYescoinBalanceAsync(int userId)
    {
        var wallet = await GetWalletByUserIdAsync(userId);
        return wallet?.YescoinBalance ?? 0.0m;
    }

    public async Task<List<Transaction>> GetUserTransactionsAsync(int userId, int limit = 50, int offset = 0)
    {
        return await _context.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Transaction> CreateTransactionAsync(
        int userId,
        string type,
        decimal amount,
        int? partnerId = null,
        int? orderId = null,
        string? description = null)
    {
        var wallet = await GetWalletByUserIdAsync(userId);
        if (wallet == null)
        {
            throw new InvalidOperationException("Кошелек не найден");
        }

        var balanceBefore = wallet.Balance;
        var balanceAfter = balanceBefore;

        // Обновляем баланс в зависимости от типа транзакции
        if (type == "topup" || type == "bonus")
        {
            balanceAfter = balanceBefore + amount;
            wallet.TotalEarned += amount;
        }
        else if (type == "payment" || type == "withdrawal")
        {
            if (balanceBefore < amount)
            {
                throw new InvalidOperationException("Недостаточно средств");
            }
            balanceAfter = balanceBefore - amount;
            wallet.TotalSpent += amount;
        }

        wallet.Balance = balanceAfter;
        wallet.LastUpdated = DateTime.UtcNow;

        var transaction = new Transaction
        {
            UserId = userId,
            PartnerId = partnerId,
            OrderId = orderId,
            Type = type,
            Amount = amount,
            Status = "completed",
            BalanceBefore = balanceBefore,
            BalanceAfter = balanceAfter,
            Description = description,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        return transaction;
    }

    public async Task<List<Transaction>> GetTransactionHistoryAsync(int userId)
    {
        return await _context.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<WalletSyncResponseDto> SyncWalletAsync(WalletSyncRequestDto request)
    {
        var wallet = await GetWalletByUserIdAsync(request.UserId);
        var hasChanges = true; // Упрощенная версия, в реальности нужно сравнивать с последней синхронизацией

        if (wallet == null)
        {
            // Создаем кошелек если его нет
            wallet = new Wallet
            {
                UserId = request.UserId,
                Balance = 0.0m,
                YescoinBalance = 0.0m,
                TotalEarned = 0.0m,
                TotalSpent = 0.0m,
                LastUpdated = DateTime.UtcNow
            };
            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();
            hasChanges = false;
        }

        return new WalletSyncResponseDto
        {
            Success = true,
            YescoinBalance = wallet.YescoinBalance,
            LastUpdated = wallet.LastUpdated,
            HasChanges = hasChanges
        };
    }

    public async Task<TopUpResponseDto> TopUpWalletAsync(TopUpRequestDto request)
    {
        // Проверка существования пользователя
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId);

        if (user == null)
        {
            throw new InvalidOperationException("Пользователь не найден");
        }

        var wallet = await GetWalletByUserIdAsync(request.UserId);
        if (wallet == null)
        {
            throw new InvalidOperationException("Кошелек не найден");
        }

        // Создаем транзакцию
        var transaction = new Transaction
        {
            UserId = request.UserId,
            Type = "topup",
            Amount = request.Amount,
            BalanceBefore = wallet.Balance,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Генерируем payment URL и QR code
        var paymentUrl = $"https://pay.yess.kg/tx/{transaction.Id}";

        // TODO: Использовать QRCoder для генерации QR кода
        // Пока возвращаем заглушку
        var qrCodeData = GenerateQRCodeData(paymentUrl);

        // Обновляем транзакцию с payment URL и QR code
        transaction.PaymentUrl = paymentUrl;
        transaction.QrCodeData = qrCodeData;
        await _context.SaveChangesAsync();

        return new TopUpResponseDto
        {
            TransactionId = transaction.Id,
            PaymentUrl = paymentUrl,
            QrCodeData = qrCodeData
        };
    }

    public async Task<object> ProcessPaymentWebhookAsync(int transactionId, string status, decimal amount)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
        {
            throw new InvalidOperationException("Транзакция не найдена");
        }

        if (transaction.Status == "completed")
        {
            return new { success = true, message = "Already processed" };
        }

        if (status == "completed" && transaction.Amount == amount)
        {
            var wallet = await GetWalletByUserIdAsync(transaction.UserId);
            if (wallet == null)
            {
                throw new InvalidOperationException("Кошелек не найден");
            }

            // Обновляем баланс с учетом множителя (по умолчанию 1.0, но можно настроить)
            var topupMultiplier = _configuration.GetValue<decimal>("Wallet:TopupMultiplier", 1.0m);
            var bonusAmount = transaction.Amount * topupMultiplier;

            wallet.Balance += bonusAmount;
            wallet.LastUpdated = DateTime.UtcNow;

            // Обновляем транзакцию
            transaction.Status = "completed";
            transaction.CompletedAt = DateTime.UtcNow;
            transaction.BalanceAfter = wallet.Balance;

            await _context.SaveChangesAsync();

            return new { success = true, message = "Payment confirmed" };
        }

        return new { success = false, message = "Invalid payment" };
    }

    private string GenerateQRCodeData(string paymentUrl)
    {
        // TODO: Реализовать генерацию QR кода через QRCoder
        // Пока возвращаем заглушку
        // В реальности нужно использовать библиотеку QRCoder для генерации изображения и конвертации в base64
        // Пример: data:image/png;base64,iVBORw0KGgoAAAANS...
        
        // Заглушка: возвращаем URL как строку для QR кода
        // В production нужно использовать QRCoder
        return $"data:image/png;base64,QR_CODE_PLACEHOLDER_FOR_{paymentUrl}";
    }
}
