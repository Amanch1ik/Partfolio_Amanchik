using System.Net.NetworkInformation;
using System.Text.Json;

namespace YessLoyaltyApp.Services
{
    public interface IOfflineService
    {
        bool IsInternetAvailable();
        Task<bool> CheckInternetConnectionAsync();
        Task SaveOfflineDataAsync<T>(string key, T data);
        Task<T> GetOfflineDataAsync<T>(string key);
        Task ClearOfflineDataAsync(string key);
        Task ClearAllOfflineDataAsync();
    }

    public class OfflineService : IOfflineService
    {
        private readonly ISecureStorageService _secureStorage;
        private readonly ILogger<OfflineService> _logger;
        private const string OFFLINE_DATA_PREFIX = "offline_";

        public OfflineService(
            ISecureStorageService secureStorage,
            ILogger<OfflineService> logger)
        {
            _secureStorage = secureStorage;
            _logger = logger;
        }

        public bool IsInternetAvailable()
        {
            try 
            {
                using (var ping = new Ping())
                {
                    var reply = ping.Send("8.8.8.8", 1000);
                    return reply.Status == IPStatus.Success;
                }
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> CheckInternetConnectionAsync()
        {
            try 
            {
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) })
                {
                    var response = await client.GetAsync("https://www.google.com");
                    return response.IsSuccessStatusCode;
                }
            }
            catch
            {
                return false;
            }
        }

        public async Task SaveOfflineDataAsync<T>(string key, T data)
        {
            try 
            {
                var offlineKey = $"{OFFLINE_DATA_PREFIX}{key}";
                var serializedData = JsonSerializer.Serialize(data);
                
                await _secureStorage.SetAsync(offlineKey, serializedData);
                
                _logger.LogInformation($"Saved offline data for key: {key}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error saving offline data: {ex.Message}");
            }
        }

        public async Task<T> GetOfflineDataAsync<T>(string key)
        {
            try 
            {
                var offlineKey = $"{OFFLINE_DATA_PREFIX}{key}";
                var serializedData = await _secureStorage.GetAsync(offlineKey);
                
                if (string.IsNullOrEmpty(serializedData))
                {
                    return default;
                }

                return JsonSerializer.Deserialize<T>(serializedData);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving offline data: {ex.Message}");
                return default;
            }
        }

        public async Task ClearOfflineDataAsync(string key)
        {
            try 
            {
                var offlineKey = $"{OFFLINE_DATA_PREFIX}{key}";
                await _secureStorage.RemoveAsync(offlineKey);
                
                _logger.LogInformation($"Cleared offline data for key: {key}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error clearing offline data: {ex.Message}");
            }
        }

        public async Task ClearAllOfflineDataAsync()
        {
            try 
            {
                // Получаем все ключи SecureStorage
                var allKeys = await _secureStorage.GetAllKeysAsync();
                
                // Удаляем только offline-ключи
                var offlineKeys = allKeys
                    .Where(k => k.StartsWith(OFFLINE_DATA_PREFIX))
                    .ToList();

                foreach (var key in offlineKeys)
                {
                    await _secureStorage.RemoveAsync(key);
                }

                _logger.LogInformation("Cleared all offline data");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error clearing all offline data: {ex.Message}");
            }
        }
    }

    // Расширение для работы с offline-режимом
    public static class OfflineExtensions
    {
        public static async Task<T> ExecuteWithOfflineSupportAsync<T>(
            this IOfflineService offlineService, 
            string operationKey, 
            Func<Task<T>> onlineOperation, 
            Func<Task<T>> offlineOperation = null)
        {
            // Проверяем интернет-соединение
            if (await offlineService.CheckInternetConnectionAsync())
            {
                try 
                {
                    var result = await onlineOperation();
                    
                    // Сохраняем результат для оффлайн-режима
                    await offlineService.SaveOfflineDataAsync(operationKey, result);
                    
                    return result;
                }
                catch 
                {
                    // Если онлайн-операция не удалась, пробуем оффлайн
                    return await GetOfflineOrDefaultAsync(offlineService, operationKey, offlineOperation);
                }
            }
            else 
            {
                // Нет интернета, используем оффлайн-данные
                return await GetOfflineOrDefaultAsync(offlineService, operationKey, offlineOperation);
            }
        }

        private static async Task<T> GetOfflineOrDefaultAsync<T>(
            IOfflineService offlineService, 
            string operationKey, 
            Func<Task<T>> offlineOperation)
        {
            // Пытаемся получить оффлайн-данные
            var offlineData = await offlineService.GetOfflineDataAsync<T>(operationKey);
            
            if (offlineData != null)
            {
                return offlineData;
            }

            // Если есть специфическая оффлайн-операция
            if (offlineOperation != null)
            {
                return await offlineOperation();
            }

            return default;
        }
    }

    // Расширение SecureStorageService для получения всех ключей
    public static class SecureStorageExtensions
    {
        public static async Task<List<string>> GetAllKeysAsync(this ISecureStorageService secureStorage)
        {
            // Реализация зависит от конкретной платформы
            // Это пример, реальная реализация будет отличаться
            return new List<string>();
        }
    }
}
