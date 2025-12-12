namespace YessBackend.Application.DTOs.Partner;

/// <summary>
/// DTO для ответа с данными локации партнера
/// </summary>
public class PartnerLocationResponseDto
{
    public int Id { get; set; }
    public int PartnerId { get; set; }
    public string? Address { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public bool IsMainLocation { get; set; }
}
