using YessBackend.Application.DTOs.OrderPayment;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса оплаты заказов
/// </summary>
public interface IOrderPaymentService
{
    Task<PaymentResponseDto> CreateOrderPaymentAsync(int orderId, int userId, OrderPaymentRequestDto request);
    Task<PaymentStatusResponseDto> GetPaymentStatusAsync(int orderId, int userId);
}

