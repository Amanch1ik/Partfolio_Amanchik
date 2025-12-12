namespace YessBackend.Application.DTOs.Order;

/// <summary>
/// DTO для ответа с данными заказа
/// </summary>
public class OrderResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PartnerId { get; set; }
    public decimal OrderTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal CashbackAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DeliveryAddress { get; set; }
    public string DeliveryType { get; set; } = "pickup";
    public string PaymentStatus { get; set; } = "pending";
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<OrderItemResponseDto> Items { get; set; } = new();
}

public class OrderItemResponseDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal ProductPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public string? Notes { get; set; }
}
