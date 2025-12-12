namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса обработки webhooks
/// </summary>
public interface IWebhookService
{
    Task<object> ProcessPaymentCallbackAsync(Dictionary<string, object> payload, string? signature);
}

