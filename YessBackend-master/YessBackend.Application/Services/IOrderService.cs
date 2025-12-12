using YessBackend.Application.DTOs.Order;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса заказов
/// </summary>
public interface IOrderService
{
    Task<OrderCalculateResponseDto> CalculateOrderAsync(
        int partnerId,
        List<OrderItemDto> items,
        int? userId = null);
    
    Task<Order> CreateOrderAsync(
        int userId,
        OrderCreateRequestDto orderRequest);
    
    Task<Order?> GetOrderByIdAsync(int orderId, int? userId = null);
    
    Task<List<Order>> GetUserOrdersAsync(int userId, int limit = 20, int offset = 0);
    
    string GenerateIdempotencyKey(int userId, int partnerId, List<OrderItemDto> items);
}
