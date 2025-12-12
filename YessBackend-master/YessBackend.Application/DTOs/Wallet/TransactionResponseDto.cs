namespace YessBackend.Application.DTOs.Wallet;

/// <summary>
/// DTO для ответа с данными транзакции
/// </summary>
public class TransactionResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? PartnerId { get; set; }
    public int? OrderId { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Commission { get; set; }
    public string? PaymentMethod { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal YescoinUsed { get; set; }
    public decimal YescoinEarned { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
