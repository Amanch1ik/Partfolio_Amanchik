using System.ComponentModel.DataAnnotations;

namespace YessBackend.Application.DTOs.Order;

/// <summary>
/// DTO для создания заказа
/// </summary>
public class OrderCreateRequestDto
{
    [Required]
    public int PartnerId { get; set; }
    
    [Required]
    public List<OrderItemDto> Items { get; set; } = new();
    
    public string? DeliveryAddress { get; set; }
    public string DeliveryType { get; set; } = "pickup";
    public string? DeliveryNotes { get; set; }
    public string? IdempotencyKey { get; set; }
}
