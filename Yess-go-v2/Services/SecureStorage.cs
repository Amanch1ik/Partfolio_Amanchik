using System.Threading.Tasks;
using Microsoft.Maui.Storage;

namespace YessGoFront.Services
{
    public class SecureStorageService
    {
        public async Task SaveAsync(string key, string value)
        {
            await SecureStorage.SetAsync(key, value);
        }

        public string? Get(string key)
        {
            return SecureStorage.GetAsync(key).GetAwaiter().GetResult();
        }

        public async Task<string?> GetAsync(string key)
        {
            return await SecureStorage.GetAsync(key);
        }

        public bool Has(string key)
        {
            var val = SecureStorage.GetAsync(key).GetAwaiter().GetResult();
            return !string.IsNullOrEmpty(val);
        }

        public async Task RemoveAsync(string key)
        {
            SecureStorage.Remove(key);
            await Task.CompletedTask;
        }

        public void Remove(string key)
        {
            SecureStorage.Remove(key);
        }

        public void ClearAll()
        {
            SecureStorage.RemoveAll();
        }
    }
}
