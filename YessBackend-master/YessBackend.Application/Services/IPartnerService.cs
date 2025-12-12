using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса партнеров
/// </summary>
public interface IPartnerService
{
    Task<List<Partner>> GetPartnersAsync(
        int? cityId = null,
        string? category = null,
        double? latitude = null,
        double? longitude = null,
        double? radiusKm = null,
        int limit = 50,
        int offset = 0);
    
    Task<Partner?> GetPartnerByIdAsync(int partnerId);
    
    Task<List<PartnerLocation>> GetPartnerLocationsAsync(int partnerId);
    
    Task<List<string>> GetCategoriesAsync();
}
