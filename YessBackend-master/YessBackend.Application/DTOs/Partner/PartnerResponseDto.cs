namespace YessBackend.Application.DTOs.Partner;

/// <summary>
/// DTO для ответа с данными партнера
/// Соответствует PartnerResponse из Python API
/// </summary>
public class PartnerResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public int? CityId { get; set; }
    public string? LogoUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public decimal CashbackRate { get; set; }
    public decimal MaxDiscountPercent { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}
