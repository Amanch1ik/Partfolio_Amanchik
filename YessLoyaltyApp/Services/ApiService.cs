using System.Net.Http.Headers;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Caching.Memory;

namespace YessLoyaltyApp.Services
{
    public class ApiResponse<T>
    {
        public bool IsSuccess { get; set; }
        public T Data { get; set; }
        public string ErrorMessage { get; set; }
        public int StatusCode { get; set; }
    }

    public class TokenResponse
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public DateTime AccessTokenExpiration { get; set; }
    }

    public class ApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _memoryCache;
        private readonly ISecureStorageService _secureStorage;
        private readonly IErrorHandlingService _errorHandlingService;

        private const string ACCESS_TOKEN_KEY = "access_token";
        private const string REFRESH_TOKEN_KEY = "refresh_token";

        public ApiService(
            HttpClient httpClient, 
            IMemoryCache memoryCache,
            ISecureStorageService secureStorage,
            IErrorHandlingService errorHandlingService)
        {
            _httpClient = httpClient;
            _memoryCache = memoryCache;
            _secureStorage = secureStorage;
            _errorHandlingService = errorHandlingService;

            ConfigureHttpClient();
        }

        private void ConfigureHttpClient()
        {
            _httpClient.BaseAddress = new Uri("https://api.yessloyalty.com/v1/");
            _httpClient.DefaultRequestHeaders.Accept.Clear();
            _httpClient.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<ApiResponse<TokenResponse>> LoginAsync(string email, string password)
        {
            try
            {
                var loginRequest = new 
                {
                    email,
                    password,
                    device_info = GetDeviceInfo()
                };

                var response = await _httpClient.PostAsJsonAsync("auth/login", loginRequest);
                
                return await HandleTokenResponse(response);
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex);
                return new ApiResponse<TokenResponse>
                {
                    IsSuccess = false,
                    ErrorMessage = "Ошибка при входе"
                };
            }
        }

        public async Task<ApiResponse<TokenResponse>> RefreshTokenAsync()
        {
            try
            {
                var refreshToken = await _secureStorage.GetAsync(REFRESH_TOKEN_KEY);
                
                var refreshRequest = new 
                { 
                    refresh_token = refreshToken 
                };

                var response = await _httpClient.PostAsJsonAsync("auth/refresh", refreshRequest);
                
                return await HandleTokenResponse(response);
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex);
                return new ApiResponse<TokenResponse>
                {
                    IsSuccess = false,
                    ErrorMessage = "Не удалось обновить токен"
                };
            }
        }

        private async Task<ApiResponse<TokenResponse>> HandleTokenResponse(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();
            
            if (response.IsSuccessStatusCode)
            {
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(content);
                
                await SaveTokens(tokenResponse);
                SetAuthorizationHeader(tokenResponse.AccessToken);

                return new ApiResponse<TokenResponse>
                {
                    IsSuccess = true,
                    Data = tokenResponse,
                    StatusCode = (int)response.StatusCode
                };
            }
            else
            {
                return new ApiResponse<TokenResponse>
                {
                    IsSuccess = false,
                    ErrorMessage = content,
                    StatusCode = (int)response.StatusCode
                };
            }
        }

        private async Task SaveTokens(TokenResponse tokenResponse)
        {
            await _secureStorage.SetAsync(ACCESS_TOKEN_KEY, tokenResponse.AccessToken);
            await _secureStorage.SetAsync(REFRESH_TOKEN_KEY, tokenResponse.RefreshToken);
        }

        private void SetAuthorizationHeader(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<ApiResponse<List<PartnerDto>>> GetPartnersAsync(
            string category = null, 
            int page = 1, 
            int pageSize = 20)
        {
            try
            {
                var queryParams = new List<string>();
                if (!string.IsNullOrEmpty(category))
                    queryParams.Add($"category={Uri.EscapeDataString(category)}");
                
                queryParams.Add($"page={page}");
                queryParams.Add($"pageSize={pageSize}");

                var url = $"partners?{string.Join("&", queryParams)}";
                
                var response = await _httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadFromJsonAsync<List<PartnerDto>>();
                    return new ApiResponse<List<PartnerDto>>
                    {
                        IsSuccess = true,
                        Data = content,
                        StatusCode = (int)response.StatusCode
                    };
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return new ApiResponse<List<PartnerDto>>
                    {
                        IsSuccess = false,
                        ErrorMessage = errorContent,
                        StatusCode = (int)response.StatusCode
                    };
                }
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex);
                return new ApiResponse<List<PartnerDto>>
                {
                    IsSuccess = false,
                    ErrorMessage = "Не удалось загрузить партнеров"
                };
            }
        }

        private Dictionary<string, string> GetDeviceInfo()
        {
            return new Dictionary<string, string>
            {
                ["platform"] = DeviceInfo.Platform.ToString(),
                ["model"] = DeviceInfo.Model,
                ["manufacturer"] = DeviceInfo.Manufacturer,
                ["version"] = DeviceInfo.Version.ToString()
            };
        }

        public bool IsTokenExpired()
        {
            var token = _httpClient.DefaultRequestHeaders.Authorization?.Parameter;
            if (string.IsNullOrEmpty(token))
                return true;

            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadToken(token) as JwtSecurityToken;

            return jsonToken?.ValidTo <= DateTime.UtcNow;
        }

        public async Task RegisterPushTokenAsync(object deviceInfo)
        {
            try 
            {
                var response = await _httpClient.PostAsJsonAsync("notifications/register-device", deviceInfo);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    throw new ApiException(
                        (int)response.StatusCode, 
                        "Не удалось зарегистрировать устройство", 
                        errorContent
                    );
                }
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex, ErrorSeverity.High);
                throw;
            }
        }

        public async Task UnregisterPushTokenAsync(string token)
        {
            try 
            {
                var response = await _httpClient.PostAsJsonAsync("notifications/unregister-device", new { token });
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    throw new ApiException(
                        (int)response.StatusCode, 
                        "Не удалось отключить устройство", 
                        errorContent
                    );
                }
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex, ErrorSeverity.High);
                throw;
            }
        }

        public async Task<ApiResponse<List<NotificationDto>>> GetNotificationsAsync(
            int page = 1, 
            int pageSize = 20)
        {
            try 
            {
                var url = $"notifications?page={page}&pageSize={pageSize}";
                var response = await _httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
                    return new ApiResponse<List<NotificationDto>>
                    {
                        IsSuccess = true,
                        Data = content,
                        StatusCode = (int)response.StatusCode
                    };
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return new ApiResponse<List<NotificationDto>>
                    {
                        IsSuccess = false,
                        ErrorMessage = errorContent,
                        StatusCode = (int)response.StatusCode
                    };
                }
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex);
                return new ApiResponse<List<NotificationDto>>
                {
                    IsSuccess = false,
                    ErrorMessage = "Не удалось загрузить уведомления"
                };
            }
        }

        public async Task MarkNotificationAsReadAsync(int notificationId)
        {
            try 
            {
                var response = await _httpClient.PostAsJsonAsync($"notifications/{notificationId}/read", null);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    throw new ApiException(
                        (int)response.StatusCode, 
                        "Не удалось отметить уведомление как прочитанное", 
                        errorContent
                    );
                }
            }
            catch (Exception ex)
            {
                _errorHandlingService.LogError(ex);
                throw;
            }
        }
    }

    public interface ISecureStorageService
    {
        Task<string> GetAsync(string key);
        Task SetAsync(string key, string value);
        Task RemoveAsync(string key);
    }

    public class SecureStorageService : ISecureStorageService
    {
        public async Task<string> GetAsync(string key)
        {
            return await SecureStorage.GetAsync(key);
        }

        public async Task SetAsync(string key, string value)
        {
            await SecureStorage.SetAsync(key, value);
        }

        public async Task RemoveAsync(string key)
        {
            SecureStorage.Remove(key);
        }
    }

    // DTO для уведомлений
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public NotificationType Type { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
        public string Data { get; set; }
    }
}
