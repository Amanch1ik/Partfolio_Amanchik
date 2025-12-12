namespace YessBackend.Application.DTOs.Order;

/// <summary>
/// DTO для ответа с расчетом заказа
/// </summary>
public class OrderCalculateResponseDto
{
    public decimal OrderTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal CashbackAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public decimal MaxDiscount { get; set; }
    public decimal? UserBalance { get; set; }
}
