using System;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace YessLoyaltyApp.Services
{
    public interface ICacheService
    {
        void Set<T>(string key, T value, TimeSpan? expiration = null);
        T Get<T>(string key);
        bool TryGetValue<T>(string key, out T value);
        void Remove(string key);
        void Clear();
    }

    public class MemoryCacheService : ICacheService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly ILogger<MemoryCacheService> _logger;

        public MemoryCacheService(
            IMemoryCache memoryCache, 
            ILogger<MemoryCacheService> logger)
        {
            _memoryCache = memoryCache;
            _logger = logger;
        }

        public void Set<T>(string key, T value, TimeSpan? expiration = null)
        {
            try 
            {
                var cacheEntryOptions = new MemoryCacheEntryOptions();
                
                if (expiration.HasValue)
                {
                    cacheEntryOptions.SetAbsoluteExpiration(expiration.Value);
                }
                else 
                {
                    // Значение по умолчанию - 1 час
                    cacheEntryOptions.SetAbsoluteExpiration(TimeSpan.FromHours(1));
                }

                _memoryCache.Set(key, value, cacheEntryOptions);
                _logger.LogInformation($"Cached item with key: {key}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error caching item with key {key}: {ex.Message}");
            }
        }

        public T Get<T>(string key)
        {
            try 
            {
                return _memoryCache.Get<T>(key);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving cached item with key {key}: {ex.Message}");
                return default;
            }
        }

        public bool TryGetValue<T>(string key, out T value)
        {
            return _memoryCache.TryGetValue(key, out value);
        }

        public void Remove(string key)
        {
            try 
            {
                _memoryCache.Remove(key);
                _logger.LogInformation($"Removed cached item with key: {key}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error removing cached item with key {key}: {ex.Message}");
            }
        }

        public void Clear()
        {
            // В реальном приложении может потребоваться более сложная логика
            (_memoryCache as MemoryCache)?.Compact(1.0);
            _logger.LogInformation("Memory cache cleared");
        }
    }

    // Расширения для удобной работы с кэшем
    public static class CacheExtensions
    {
        public static async Task<T> GetOrCreateAsync<T>(
            this ICacheService cacheService, 
            string key, 
            Func<Task<T>> factory, 
            TimeSpan? expiration = null)
        {
            // Попытка получить из кэша
            if (cacheService.TryGetValue(key, out T cachedValue))
            {
                return cachedValue;
            }

            // Если нет в кэше - создаем
            var value = await factory();
            
            // Кэшируем
            cacheService.Set(key, value, expiration);
            
            return value;
        }
    }
}
