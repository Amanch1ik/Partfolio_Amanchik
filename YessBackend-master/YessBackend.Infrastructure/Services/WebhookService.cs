using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис обработки webhooks
/// Реализует логику из Python WebhookService
/// </summary>
public class WebhookService : IWebhookService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebhookService> _logger;

    public WebhookService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<WebhookService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<object> ProcessPaymentCallbackAsync(Dictionary<string, object> payload, string? signature)
    {
        try
        {
            // Проверка подписи (если требуется)
            if (!string.IsNullOrEmpty(signature))
            {
                var secret = _configuration["PaymentProviders:WebhookSecret"] ?? "default_secret";
                var payloadJson = JsonSerializer.Serialize(payload);
                var payloadBytes = Encoding.UTF8.GetBytes(payloadJson);

                if (!VerifySignature(payloadBytes, signature, secret))
                {
                    throw new InvalidOperationException("Invalid signature");
                }
            }

            // Извлечение данных
            var transactionId = payload.ContainsKey("transaction_id") 
                ? Convert.ToInt32(payload["transaction_id"].ToString()) 
                : 0;
            var status = payload.ContainsKey("status") 
                ? payload["status"].ToString() 
                : "unknown";
            var amount = payload.ContainsKey("amount") 
                ? Convert.ToDecimal(payload["amount"].ToString()) 
                : 0;

            if (transactionId == 0)
            {
                throw new InvalidOperationException("Missing transaction_id");
            }

            // Поиск транзакции
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null)
            {
                throw new InvalidOperationException("Transaction not found");
            }

            // Обновление статуса транзакции
            if (status == "success")
            {
                transaction.Status = "completed";
                transaction.CompletedAt = DateTime.UtcNow;

                // Если это оплата заказа
                if (transaction.OrderId.HasValue)
                {
                    var order = await _context.Orders
                        .FirstOrDefaultAsync(o => o.Id == transaction.OrderId.Value);

                    if (order != null && order.Status == OrderStatus.Pending)
                    {
                        order.Status = OrderStatus.Paid;
                        order.PaymentStatus = "paid";
                        order.PaidAt = DateTime.UtcNow;

                        // TODO: Начисление кэшбэка через CashbackService
                    }
                }

                await _context.SaveChangesAsync();
            }
            else if (status == "failed" || status == "cancelled")
            {
                transaction.Status = "failed";
                await _context.SaveChangesAsync();
            }

            return new { success = true, message = "Payment processed" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обработки webhook");
            throw;
        }
    }

    private bool VerifySignature(byte[] payload, string signature, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(payload);
        var computedSignature = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        
        return string.Equals(computedSignature, signature, StringComparison.OrdinalIgnoreCase);
    }
}

