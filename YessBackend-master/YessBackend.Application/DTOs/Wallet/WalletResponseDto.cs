namespace YessBackend.Application.DTOs.Wallet;

/// <summary>
/// DTO для ответа с данными кошелька
/// Соответствует WalletResponse из Python API
/// </summary>
public class WalletResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Balance { get; set; }
    public decimal YescoinBalance { get; set; }
    public decimal TotalEarned { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime LastUpdated { get; set; }
}
