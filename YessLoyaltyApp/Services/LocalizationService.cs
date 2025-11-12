using System;
using System.Collections.Generic;
using System.Globalization;
using System.Resources;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace YessLoyaltyApp.Services
{
    public interface ILocalizationService
    {
        string Translate(string key);
        Task<bool> SetLanguageAsync(string languageCode);
        Task<string> GetCurrentLanguageAsync();
        List<CultureInfo> GetSupportedLanguages();
        event EventHandler LanguageChanged;
    }

    public class LocalizationService : ILocalizationService
    {
        private readonly ILogger<LocalizationService> _logger;
        private readonly ISecureStorageService _secureStorage;
        private ResourceManager _resourceManager;
        private CultureInfo _currentCulture;

        private static readonly List<CultureInfo> _supportedLanguages = new List<CultureInfo>
        {
            new CultureInfo("ru-RU"),  // Русский
            new CultureInfo("en-US"),  // Английский
            new CultureInfo("kk-KZ"),  // Казахский
            new CultureInfo("ky-KG"),  // Кыргызский
        };

        public event EventHandler LanguageChanged;

        public LocalizationService(
            ILogger<LocalizationService> logger,
            ISecureStorageService secureStorage)
        {
            _logger = logger;
            _secureStorage = secureStorage;
            InitializeResourceManager();
            SetDefaultLanguage();
        }

        private void InitializeResourceManager()
        {
            // Предполагаем, что у вас есть ResourceManager для локализации
            _resourceManager = new ResourceManager(
                "YessLoyaltyApp.Resources.Strings", 
                typeof(LocalizationService).Assembly
            );
        }

        private async void SetDefaultLanguage()
        {
            var savedLanguage = await _secureStorage.GetAsync("AppLanguage");
            
            if (string.IsNullOrEmpty(savedLanguage))
            {
                // Определяем язык устройства
                savedLanguage = CultureInfo.CurrentCulture.TwoLetterISOLanguageName switch
                {
                    "ru" => "ru-RU",
                    "en" => "en-US",
                    "kk" => "kk-KZ",
                    "ky" => "ky-KG",
                    _ => "ru-RU"  // По умолчанию русский
                };
            }

            await SetLanguageAsync(savedLanguage);
        }

        public string Translate(string key)
        {
            try
            {
                return _resourceManager.GetString(key, _currentCulture) ?? key;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Translation error for key: {key}. {ex.Message}");
                return key;
            }
        }

        public async Task<bool> SetLanguageAsync(string languageCode)
        {
            try
            {
                var culture = _supportedLanguages.Find(c => c.Name == languageCode);
                
                if (culture == null)
                {
                    _logger.LogWarning($"Unsupported language: {languageCode}");
                    return false;
                }

                _currentCulture = culture;
                CultureInfo.DefaultThreadCurrentCulture = culture;
                CultureInfo.DefaultThreadCurrentUICulture = culture;

                await _secureStorage.SetAsync("AppLanguage", languageCode);

                // Уведомляем подписчиков о смене языка
                LanguageChanged?.Invoke(this, EventArgs.Empty);

                _logger.LogInformation($"Language set to: {languageCode}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error setting language: {ex.Message}");
                return false;
            }
        }

        public async Task<string> GetCurrentLanguageAsync()
        {
            return await _secureStorage.GetAsync("AppLanguage") ?? "ru-RU";
        }

        public List<CultureInfo> GetSupportedLanguages() => _supportedLanguages;

        // Методы для форматирования с учетом локали
        public string FormatCurrency(decimal amount)
        {
            return amount.ToString("C", _currentCulture);
        }

        public string FormatDate(DateTime date)
        {
            return date.ToString("D", _currentCulture);
        }

        public string FormatNumber(int number)
        {
            return number.ToString("N0", _currentCulture);
        }
    }
}
