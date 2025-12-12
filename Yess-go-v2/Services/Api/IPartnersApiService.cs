using YessGoFront.Models;

namespace YessGoFront.Services.Api;

/// <summary>
/// API сервис для работы с партнёрами
/// </summary>
public interface IPartnersApiService
{
    /// <summary>
    /// Получить всех активных партнёров
    /// </summary>
    Task<IReadOnlyList<PartnerDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Получить партнёров по категории
    /// </summary>
    Task<IReadOnlyList<PartnerDto>> GetByCategoryAsync(string category, CancellationToken ct = default);

    /// <summary>
    /// Получить партнёров по id категории
    /// </summary>
    Task<IReadOnlyList<PartnerDto>> GetByCategoryIdAsync(int categoryId, CancellationToken ct = default);

    /// <summary>
    /// Получить партнёра по ID
    /// </summary>
    Task<PartnerDetailDto> GetByIdAsync(string id, CancellationToken ct = default);

    /// <summary>
    /// Поиск партнёров
    /// </summary>
    Task<IReadOnlyList<PartnerDto>> SearchAsync(string query, CancellationToken ct = default);

    /// <summary>
    /// Получить партнёров рядом с указанными координатами
    /// </summary>
    Task<IReadOnlyList<PartnerDto>> GetNearbyAsync(double latitude, double longitude, int radius = 5000, CancellationToken ct = default);

    /// <summary>
    /// Получить продукты партнёра
    /// </summary>
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(string partnerId, CancellationToken ct = default);
}

