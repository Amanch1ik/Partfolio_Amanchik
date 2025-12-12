using System.Collections.Generic;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса платежного провайдера (мок Optima Bank)
/// </summary>
public interface IPaymentProviderService
{
    Task<object> CreatePaymentAsync(int orderId, decimal amount, Dictionary<string, object>? additionalData);
    Task<object> CheckPaymentStatusAsync(string transactionId);
    Task<object> CancelPaymentAsync(string transactionId);
    Task<object> GetPaymentMethodsAsync();
}

