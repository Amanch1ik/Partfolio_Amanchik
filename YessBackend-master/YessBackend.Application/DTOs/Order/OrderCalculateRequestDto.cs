using System.ComponentModel.DataAnnotations;

namespace YessBackend.Application.DTOs.Order;

/// <summary>
/// DTO для запроса расчета заказа
/// </summary>
public class OrderCalculateRequestDto
{
    [Required]
    public int PartnerId { get; set; }
    
    [Required]
    public List<OrderItemDto> Items { get; set; } = new();
}
