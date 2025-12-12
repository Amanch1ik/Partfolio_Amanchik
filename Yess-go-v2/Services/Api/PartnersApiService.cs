using System.Linq;
using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Models;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.Services.Api;

/// <summary>
/// Реализация API сервиса для работы с партнёрами
/// </summary>
public class PartnersApiService : ApiClient, IPartnersApiService
{
    public PartnersApiService(
        HttpClient httpClient,
        ILogger<PartnersApiService>? logger = null)
        : base(httpClient, logger)
    {
    }

    public async Task<IReadOnlyList<PartnerDto>> GetAllAsync(
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.PartnersEndpoints.List;
        
#if ANDROID
        Log.Info("PartnersApiService", $"[GetAllAsync] Запрос партнёров с эндпоинта: {endpoint}");
#endif
        System.Diagnostics.Debug.WriteLine($"[PartnersApiService] Fetching partners from: {endpoint}");
        Logger?.LogInformation("[PartnersApiService] Fetching partners from: {Endpoint}", endpoint);
        
        var result = await GetAsync<List<PartnerDto>>(endpoint, ct);
        
#if ANDROID
        Log.Info("PartnersApiService", $"[GetAllAsync] Получено партнёров: {result?.Count ?? 0}");
#endif
        System.Diagnostics.Debug.WriteLine($"[PartnersApiService] Loaded {result?.Count ?? 0} partners");
        
        if (result != null && result.Count > 0)
        {
            Logger?.LogInformation("[PartnersApiService] Loaded {Count} partners", result.Count);
            // Логируем ВСЕ партнёры для отладки
            foreach (var partner in result)
            {
                var logoUrl = partner.LogoUrl ?? "null";
#if ANDROID
                Log.Info("PartnersApiService", $"[GetAllAsync] Partner: Id={partner.Id}, Name={partner.Name}, LogoUrl={logoUrl}");
#endif
                System.Diagnostics.Debug.WriteLine($"[PartnersApiService] Partner: Id={partner.Id}, Name={partner.Name}, LogoUrl={logoUrl}");
                Logger?.LogInformation("[PartnersApiService] Partner: Id={Id}, Name={Name}, LogoUrl={LogoUrl}", 
                    partner.Id, partner.Name, logoUrl);
            }
        }
        else
        {
#if ANDROID
            Log.Warn("PartnersApiService", "[GetAllAsync] Партнёры не загружены или результат пуст");
#endif
            System.Diagnostics.Debug.WriteLine("[PartnersApiService] No partners loaded or empty result");
            Logger?.LogWarning("[PartnersApiService] No partners loaded or empty result");
        }
        
        return result ?? new List<PartnerDto>();
    }

    public async Task<IReadOnlyList<PartnerDto>> GetByCategoryAsync(
        string category,
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.PartnersEndpoints.ByCategory(category);
        var result = await GetAsync<List<PartnerDto>>(endpoint, ct);
        return result ?? new List<PartnerDto>();
    }

    // Новая реализация: запрос по categoryId через query param
    public async Task<IReadOnlyList<PartnerDto>> GetByCategoryIdAsync(
        int categoryId,
        CancellationToken ct = default)
    {
        var endpoint = $"{ApiEndpoints.PartnersEndpoints.List}?categoryId={categoryId}";
        var result = await GetAsync<List<PartnerDto>>(endpoint, ct);
        return result ?? new List<PartnerDto>();
    }

    public async Task<PartnerDetailDto> GetByIdAsync(
        string id,
        CancellationToken ct = default)
    {
        if (!int.TryParse(id, out var partnerId))
        {
            throw new ArgumentException($"Invalid partner ID: {id}", nameof(id));
        }
        var endpoint = ApiEndpoints.PartnersEndpoints.ById(partnerId);
        return await GetAsync<PartnerDetailDto>(endpoint, ct);
    }

    public async Task<IReadOnlyList<PartnerDto>> SearchAsync(
        string query,
        CancellationToken ct = default)
    {
        var endpoint = $"{ApiEndpoints.PartnersEndpoints.List}?query={Uri.EscapeDataString(query)}";
        var result = await GetAsync<List<PartnerDto>>(endpoint, ct);
        return result ?? new List<PartnerDto>();
    }

    public async Task<IReadOnlyList<PartnerDto>> GetNearbyAsync(
        double latitude,
        double longitude,
        int radius = 5000,
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.PartnersEndpoints.Nearby(latitude, longitude, radius / 1000.0); // Преобразуем радиус из метров в километры
        var result = await GetAsync<List<PartnerDto>>(endpoint, ct);
        return result ?? new List<PartnerDto>();
    }

    public async Task<IReadOnlyList<ProductDto>> GetProductsAsync(
        string partnerId,
        CancellationToken ct = default)
    {
        if (!int.TryParse(partnerId, out var id))
        {
            throw new ArgumentException($"Invalid partner ID: {partnerId}", nameof(partnerId));
        }
        var endpoint = ApiEndpoints.PartnersEndpoints.Products(id);
        var result = await GetAsync<List<ProductDto>>(endpoint, ct);
        return result ?? new List<ProductDto>();
    }
}

