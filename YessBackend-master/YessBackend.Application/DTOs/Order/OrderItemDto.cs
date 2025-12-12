namespace YessBackend.Application.DTOs.Order;

/// <summary>
/// DTO для элемента заказа
/// </summary>
public class OrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Notes { get; set; }
}
