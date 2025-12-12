using System.Collections.Generic;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Models;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.Services.Api;

public interface IBannerApiService
{
    Task<List<BannerDto>> GetBannersAsync(CancellationToken ct = default);
    Task<List<BannerDto>> GetActiveBannersAsync(CancellationToken ct = default);
}

public class BannerApiService : ApiClient, IBannerApiService
{
    public BannerApiService(HttpClient httpClient, ILogger<BannerApiService>? logger = null)
        : base(httpClient, logger)
    {
    }

    public async Task<List<BannerDto>> GetBannersAsync(CancellationToken ct = default)
    {
        // Пробуем сначала как обёрнутый ответ, потом как прямой список
        try
        {
            var wrappedResponse = await GetAsync<BannerResponse>(ApiEndpoints.BannerEndpoints.List, ct);
            if (wrappedResponse != null && wrappedResponse.Items != null)
            {
                return wrappedResponse.Items;
            }
        }
        catch
        {
            // Если не получилось как обёрнутый ответ, пробуем как прямой список
            var directResponse = await GetAsync<List<BannerDto>>(ApiEndpoints.BannerEndpoints.List, ct);
            return directResponse ?? new List<BannerDto>();
        }
        
        return new List<BannerDto>();
    }

    public async Task<List<BannerDto>> GetActiveBannersAsync(CancellationToken ct = default)
    {
#if ANDROID
        Log.Info("BannerApiService", $"[GetActiveBannersAsync] Запрос активных баннеров");
#endif
        System.Diagnostics.Debug.WriteLine("[BannerApiService] Requesting active banners");
        
        // Пробуем сначала как обёрнутый ответ, потом как прямой список
        try
        {
            var wrappedResponse = await GetAsync<BannerResponse>(ApiEndpoints.BannerEndpoints.Active, ct);
            if (wrappedResponse != null && wrappedResponse.Items != null)
            {
#if ANDROID
                Log.Info("BannerApiService", $"[GetActiveBannersAsync] Получено баннеров (из обёртки): {wrappedResponse.Items.Count}");
                foreach (var banner in wrappedResponse.Items)
                {
                    Log.Info("BannerApiService", $"[GetActiveBannersAsync] Banner: Id={banner.Id}, ImageUrl={banner.ImageUrl ?? "null"}, Title={banner.Title ?? "null"}");
                }
#endif
                System.Diagnostics.Debug.WriteLine($"[BannerApiService] Loaded {wrappedResponse.Items.Count} banners (from wrapper)");
                return wrappedResponse.Items;
            }
        }
        catch
        {
            // Если не получилось как обёрнутый ответ, пробуем как прямой список
            var directResponse = await GetAsync<List<BannerDto>>(ApiEndpoints.BannerEndpoints.Active, ct);
            if (directResponse != null)
            {
#if ANDROID
                Log.Info("BannerApiService", $"[GetActiveBannersAsync] Получено баннеров (прямой список): {directResponse.Count}");
                foreach (var banner in directResponse)
                {
                    Log.Info("BannerApiService", $"[GetActiveBannersAsync] Banner: Id={banner.Id}, ImageUrl={banner.ImageUrl ?? "null"}, Title={banner.Title ?? "null"}");
                }
#endif
                System.Diagnostics.Debug.WriteLine($"[BannerApiService] Loaded {directResponse.Count} banners (direct list)");
                return directResponse;
            }
        }
        
#if ANDROID
        Log.Warn("BannerApiService", "[GetActiveBannersAsync] Не удалось загрузить баннеры");
#endif
        System.Diagnostics.Debug.WriteLine("[BannerApiService] Failed to load banners");
        
        return new List<BannerDto>();
    }
}

