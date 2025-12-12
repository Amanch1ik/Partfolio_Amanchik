using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис платежного провайдера (мок Optima Bank)
/// </summary>
public class PaymentProviderService : IPaymentProviderService
{
    private readonly ILogger<PaymentProviderService> _logger;

    public PaymentProviderService(ILogger<PaymentProviderService> logger)
    {
        _logger = logger;
    }

    public Task<object> CreatePaymentAsync(int orderId, decimal amount, Dictionary<string, object>? additionalData)
    {
        // Мок-реализация
        var transactionId = Guid.NewGuid().ToString();
        var paymentUrl = $"https://pay.example.com/payment/{transactionId}";

        _logger.LogInformation("Mock payment created: OrderId={OrderId}, Amount={Amount}, TransactionId={TransactionId}",
            orderId, amount, transactionId);

        return Task.FromResult<object>(new
        {
            success = true,
            transaction_id = transactionId,
            payment_url = paymentUrl,
            qr_code = $"data:image/png;base64,QR_PLACEHOLDER_{transactionId}",
            status = "pending",
            message = "Payment created (mock)"
        });
    }

    public Task<object> CheckPaymentStatusAsync(string transactionId)
    {
        // Мок-реализация
        _logger.LogInformation("Mock payment status check: TransactionId={TransactionId}", transactionId);

        return Task.FromResult<object>(new
        {
            transaction_id = transactionId,
            status = "pending",
            amount = 0.0m,
            paid_at = (DateTime?)null,
            message = "Payment status (mock)"
        });
    }

    public Task<object> CancelPaymentAsync(string transactionId)
    {
        // Мок-реализация
        _logger.LogInformation("Mock payment cancellation: TransactionId={TransactionId}", transactionId);

        return Task.FromResult<object>(new
        {
            success = true,
            transaction_id = transactionId,
            status = "cancelled",
            message = "Payment cancelled (mock)"
        });
    }

    public Task<object> GetPaymentMethodsAsync()
    {
        // Мок-реализация
        return Task.FromResult<object>(new
        {
            methods = new[]
            {
                new { id = "card", name = "Банковская карта", enabled = true },
                new { id = "qr", name = "QR код", enabled = true },
                new { id = "bank", name = "Банковский перевод", enabled = true }
            }
        });
    }
}

