using System;
using System.Threading.Tasks;
using Microsoft.Maui.Devices;
using Microsoft.Extensions.Logging;
using System.Collections.Generic; // Added missing import

namespace YessLoyaltyApp.Services
{
    public interface IBiometricService
    {
        Task<bool> AuthenticateAsync(string reason);
        Task<bool> IsBiometricAvailableAsync();
        Task<BiometricAvailability> GetBiometricAvailabilityAsync();
        Task ConfigureBiometricSettingsAsync();
    }

    public enum BiometricType
    {
        Fingerprint,
        Face,
        Iris,
        None
    }

    public class BiometricService : IBiometricService
    {
        private readonly ILogger<BiometricService> _logger;
        private readonly IMonitoringService _monitoringService;
        private readonly ISecureStorageService _secureStorage;

        public BiometricService(
            ILogger<BiometricService> logger,
            IMonitoringService monitoringService,
            ISecureStorageService secureStorage)
        {
            _logger = logger;
            _monitoringService = monitoringService;
            _secureStorage = secureStorage;
        }

        public async Task<bool> AuthenticateAsync(string reason)
        {
            try
            {
                // Проверяем, включена ли биометрическая аутентификация
                var isBiometricEnabled = await _secureStorage.GetAsync("BiometricEnabled") == "true";
                if (!isBiometricEnabled)
                {
                    return false;
                }

                var availability = await GetBiometricAvailabilityAsync();
                if (availability.Status != BiometricStatus.Available)
                {
                    _logger.LogWarning($"Биометрия недоступна: {availability.Status}");
                    return false;
                }

                var result = await Fingerprint.AuthenticateAsync(reason);

                _monitoringService.TrackEvent("BiometricAuthentication", new Dictionary<string, string>
                {
                    { "Status", result.Authenticated.ToString() },
                    { "Type", availability.Type.ToString() }
                });

                return result.Authenticated;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка биометрической аутентификации");
                _monitoringService.TrackException(ex);
                return false;
            }
        }

        public async Task<bool> IsBiometricAvailableAsync()
        {
            var availability = await GetBiometricAvailabilityAsync();
            return availability.Status == BiometricStatus.Available;
        }

        public async Task<BiometricAvailability> GetBiometricAvailabilityAsync()
        {
            try
            {
                var availability = new BiometricAvailability();

                // Определение типа биометрии
                if (DeviceInfo.Platform == DevicePlatform.iOS)
                {
                    availability.Type = BiometricType.Face;
                }
                else if (DeviceInfo.Platform == DevicePlatform.Android)
                {
                    availability.Type = BiometricType.Fingerprint;
                }
                else
                {
                    availability.Type = BiometricType.None;
                }

                // Проверка доступности
                var result = await Fingerprint.GetAvailabilityAsync();
                availability.Status = result switch
                {
                    FingerprintAvailability.Available => BiometricStatus.Available,
                    FingerprintAvailability.NoFingerprint => BiometricStatus.NoFingerprint,
                    FingerprintAvailability.NoPermission => BiometricStatus.NoPermission,
                    FingerprintAvailability.NoHardware => BiometricStatus.NoHardware,
                    _ => BiometricStatus.Unavailable
                };

                return availability;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка проверки биометрии");
                _monitoringService.TrackException(ex);
                return new BiometricAvailability
                {
                    Type = BiometricType.None,
                    Status = BiometricStatus.Unavailable
                };
            }
        }

        public async Task ConfigureBiometricSettingsAsync()
        {
            try
            {
                var availability = await GetBiometricAvailabilityAsync();
                
                if (availability.Status != BiometricStatus.Available)
                {
                    await _secureStorage.SetAsync("BiometricEnabled", "false");
                    return;
                }

                // Диалог настройки
                var enableBiometric = await Application.Current.MainPage.DisplayAlert(
                    "Биометрическая аутентификация",
                    $"Хотите использовать {availability.Type} для входа?",
                    "Включить",
                    "Отмена"
                );

                await _secureStorage.SetAsync("BiometricEnabled", enableBiometric.ToString().ToLower());

                _monitoringService.TrackEvent("BiometricSettingsConfigured", new Dictionary<string, string>
                {
                    { "Enabled", enableBiometric.ToString() },
                    { "Type", availability.Type.ToString() }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка настройки биометрии");
                _monitoringService.TrackException(ex);
            }
        }
    }

    public class BiometricAvailability
    {
        public BiometricType Type { get; set; }
        public BiometricStatus Status { get; set; }
    }

    public enum BiometricStatus
    {
        Available,
        NoFingerprint,
        NoPermission,
        NoHardware,
        Unavailable
    }
}
