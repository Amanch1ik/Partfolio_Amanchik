using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Extensions.Configuration;
using YessLoyaltyApp.Models;

namespace YessLoyaltyApp.Services
{
    public interface IAdvancedSecurityService
    {
        Task<bool> VerifyGeolocationAuthenticationAsync();
        Task<string> GenerateSecureTokenAsync();
        Task<bool> DetectUnusualActivityAsync();
        Task<SecurityRisk> AssessSecurityRiskAsync();
        Task<bool> ProtectSensitiveDataAsync(string data);
        Task<string> DecryptSensitiveDataAsync(string encryptedData);
    }

    public class SecurityRisk
    {
        public RiskLevel Level { get; set; }
        public string Description { get; set; }
        public DateTime Timestamp { get; set; }
        public List<string> DetectedIssues { get; set; }
    }

    public enum RiskLevel
    {
        Low,
        Medium,
        High,
        Critical
    }

    public class AdvancedSecurityService : IAdvancedSecurityService
    {
        private readonly IMonitoringService _monitoringService;
        private readonly IBiometricService _biometricService;
        private readonly ISecureStorageService _secureStorage;
        private readonly IConfiguration _configuration;
        private readonly Location _lastKnownLocation;
        private readonly string _encryptionKey;

        public AdvancedSecurityService(
            IMonitoringService monitoringService,
            IBiometricService biometricService,
            ISecureStorageService secureStorage,
            IConfiguration configuration)
        {
            _monitoringService = monitoringService;
            _biometricService = biometricService;
            _secureStorage = secureStorage;
            _configuration = configuration;
            
            // Получаем ключ шифрования из конфигурации или переменных окружения
            _encryptionKey = _configuration["Security:EncryptionKey"] 
                ?? Environment.GetEnvironmentVariable("YESS_ENCRYPTION_KEY")
                ?? throw new InvalidOperationException(
                    "EncryptionKey не настроен. Установите Security:EncryptionKey в appsettings.json " +
                    "или переменную окружения YESS_ENCRYPTION_KEY");
            
            if (_encryptionKey.Length < 32)
            {
                throw new InvalidOperationException(
                    "EncryptionKey должен быть минимум 32 символа для безопасности");
            }
        }

        public async Task<bool> VerifyGeolocationAuthenticationAsync()
        {
            try 
            {
                var currentLocation = await Geolocation.GetLocationAsync();
                var savedLocation = await _secureStorage.GetAsync("LastAuthLocation");

                if (string.IsNullOrEmpty(savedLocation))
                {
                    await _secureStorage.SetAsync(
                        "LastAuthLocation", 
                        $"{currentLocation.Latitude},{currentLocation.Longitude}"
                    );
                    return true;
                }

                var savedCoords = savedLocation.Split(',');
                var savedLat = double.Parse(savedCoords[0]);
                var savedLon = double.Parse(savedCoords[1]);

                var distance = Location.CalculateDistance(
                    currentLocation.Latitude, currentLocation.Longitude,
                    savedLat, savedLon,
                    DistanceUnits.Kilometers
                );

                // Если расстояние больше 50 км - дополнительная аутентификация
                if (distance > 50)
                {
                    var biometricResult = await _biometricService.AuthenticateAsync(
                        "Подтвердите вход с нового устройства"
                    );

                    if (biometricResult)
                    {
                        await _secureStorage.SetAsync(
                            "LastAuthLocation", 
                            $"{currentLocation.Latitude},{currentLocation.Longitude}"
                        );
                    }

                    return biometricResult;
                }

                return true;
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                return false;
            }
        }

        public async Task<string> GenerateSecureTokenAsync()
        {
            using (var rng = new RNGCryptoServiceProvider())
            {
                byte[] tokenData = new byte[32];
                rng.GetBytes(tokenData);

                var token = Convert.ToBase64String(tokenData);
                await _secureStorage.SetAsync("SecureToken", token);

                return token;
            }
        }

        public async Task<bool> DetectUnusualActivityAsync()
        {
            try 
            {
                var lastLoginTime = await _secureStorage.GetAsync("LastLoginTime");
                var currentTime = DateTime.UtcNow;

                if (DateTime.TryParse(lastLoginTime, out DateTime parsedLastLogin))
                {
                    var timeDiff = currentTime - parsedLastLogin;

                    // Необычная активность: вход с большим перерывом или частые входы
                    if (timeDiff.TotalDays > 30 || timeDiff.TotalMinutes < 5)
                    {
                        _monitoringService.TrackEvent("UnusualActivity", new Dictionary<string, string>
                        {
                            { "TimeSinceLastLogin", timeDiff.ToString() }
                        });

                        return true;
                    }
                }

                await _secureStorage.SetAsync("LastLoginTime", currentTime.ToString());
                return false;
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                return false;
            }
        }

        public async Task<SecurityRisk> AssessSecurityRiskAsync()
        {
            var risks = new List<string>();

            if (!await _biometricService.IsBiometricAvailableAsync())
                risks.Add("Биометрия не настроена");

            var unusualActivity = await DetectUnusualActivityAsync();
            if (unusualActivity)
                risks.Add("Обнаружена нестандартная активность");

            return new SecurityRisk
            {
                Level = risks.Count > 1 ? RiskLevel.High : RiskLevel.Low,
                Description = string.Join(", ", risks),
                Timestamp = DateTime.UtcNow,
                DetectedIssues = risks
            };
        }

        public async Task<bool> ProtectSensitiveDataAsync(string data)
        {
            try 
            {
                using (Aes aes = Aes.Create())
                {
                    aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
                    aes.IV = new byte[16];

                    using (var encryptor = aes.CreateEncryptor())
                    {
                        var encryptedData = EncryptStringToBytes(data, aes.Key, aes.IV);
                        await _secureStorage.SetAsync("SensitiveData", Convert.ToBase64String(encryptedData));
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                return false;
            }
        }

        public async Task<string> DecryptSensitiveDataAsync(string encryptedData)
        {
            try 
            {
                using (Aes aes = Aes.Create())
                {
                    aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
                    aes.IV = new byte[16];

                    var storedData = await _secureStorage.GetAsync("SensitiveData");
                    var dataBytes = Convert.FromBase64String(storedData);

                    using (var decryptor = aes.CreateDecryptor())
                    {
                        return DecryptBytesToString(dataBytes, aes.Key, aes.IV);
                    }
                }
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                return null;
            }
        }

        private byte[] EncryptStringToBytes(string plainText, byte[] key, byte[] iv)
        {
            byte[] encrypted;
            using (var aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                {
                    using (var msEncrypt = new System.IO.MemoryStream())
                    {
                        using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                        {
                            using (var swEncrypt = new System.IO.StreamWriter(csEncrypt))
                            {
                                swEncrypt.Write(plainText);
                            }
                            encrypted = msEncrypt.ToArray();
                        }
                    }
                }
            }
            return encrypted;
        }

        private string DecryptBytesToString(byte[] cipherText, byte[] key, byte[] iv)
        {
            string plaintext = null;
            using (var aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                {
                    using (var msDecrypt = new System.IO.MemoryStream(cipherText))
                    {
                        using (var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                        {
                            using (var srDecrypt = new System.IO.StreamReader(csDecrypt))
                            {
                                plaintext = srDecrypt.ReadToEnd();
                            }
                        }
                    }
                }
            }
            return plaintext;
        }
    }
}
