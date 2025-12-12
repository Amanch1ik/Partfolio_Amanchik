using System.Collections.Concurrent;
using System.Net.Http;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace YessGoFront.Services;

public interface IImageCacheService
{
    Task<SKBitmap?> LoadImageAsync(string? url, CancellationToken cancellationToken = default);
    void ClearCache();
}

public class ImageCacheService : IImageCacheService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ImageCacheService>? _logger;
    private readonly ConcurrentDictionary<string, SKBitmap> _cache = new();
    private readonly SemaphoreSlim _semaphore = new(10); // Максимум 10 одновременных загрузок

    public ImageCacheService(IHttpClientFactory httpClientFactory, ILogger<ImageCacheService>? logger = null)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<SKBitmap?> LoadImageAsync(string? url, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        // Проверяем кэш
        if (_cache.TryGetValue(url, out var cachedBitmap))
        {
            _logger?.LogDebug($"Image loaded from cache: {url}");
            return cachedBitmap;
        }

        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            // Двойная проверка после получения семафора
            if (_cache.TryGetValue(url, out cachedBitmap))
            {
                return cachedBitmap;
            }

            _logger?.LogInformation($"Loading image from URL: {url}");

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            var response = await httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogWarning($"Failed to load image: {url}, Status: {response.StatusCode}");
                return null;
            }

            var imageBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (imageBytes == null || imageBytes.Length == 0)
            {
                _logger?.LogWarning($"Empty image data: {url}");
                return null;
            }

            // Создаём SKBitmap из байтов
            var bitmap = SKBitmap.Decode(imageBytes);
            if (bitmap == null)
            {
                _logger?.LogWarning($"Failed to decode image: {url}");
                return null;
            }

            // Кэшируем
            _cache.TryAdd(url, bitmap);
            _logger?.LogInformation($"Image loaded and cached: {url}, Size: {bitmap.Width}x{bitmap.Height}");

            return bitmap;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error loading image: {url}");
            return null;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public void ClearCache()
    {
        foreach (var bitmap in _cache.Values)
        {
            bitmap?.Dispose();
        }
        _cache.Clear();
        _logger?.LogInformation("Image cache cleared");
    }
}

