using Microsoft.Maui.Storage;
using YessGoFront.Config;

namespace YessGoFront.Infrastructure.Auth;

/// <summary>
/// Реализация сервиса аутентификации с использованием SecureStorage
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private const string AccessTokenKey = "auth_access_token";
    private const string RefreshTokenKey = "auth_refresh_token";

    public async Task<string?> GetAccessTokenAsync()
    {
        try
        {
            var token = await SecureStorage.GetAsync(AccessTokenKey);
            // Возвращаем access token, если он есть
            // Refresh token может отсутствовать, если бэкенд его не возвращает
            // Это нормально - access token достаточен для аутентификации
            return token;
        }
        catch
        {
            return null;
        }
    }

    public async Task<string?> GetRefreshTokenAsync()
    {
        try
        {
            return await SecureStorage.GetAsync(RefreshTokenKey);
        }
        catch
        {
            return null;
        }
    }

    public async Task SaveTokensAsync(string accessToken, string? refreshToken = null)
    {
        try
        {
            await SecureStorage.SetAsync(AccessTokenKey, accessToken);
            
            // RefreshToken может быть null, если бэкенд его не возвращает
            if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                await SecureStorage.SetAsync(RefreshTokenKey, refreshToken);
            }
            else
            {
                // Если refreshToken не предоставлен, удаляем старый (если есть)
                SecureStorage.Remove(RefreshTokenKey);
            }
        }
        catch (Exception ex)
        {
            // Логируем ошибку, но не прерываем процесс
            System.Diagnostics.Debug.WriteLine($"[AuthenticationService] Error saving tokens: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> RefreshTokenAsync()
    {
        try
        {
            var refreshToken = await GetRefreshTokenAsync();
            System.Diagnostics.Debug.WriteLine($"[AuthenticationService] RefreshTokenAsync: token exists = {!string.IsNullOrWhiteSpace(refreshToken)}");
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                System.Diagnostics.Debug.WriteLine("[AuthenticationService] Refresh token not found");
                return false;
            }

            // Получаем HttpClient через DI
            var httpClientFactory = MauiProgram.Services.GetService<System.Net.Http.IHttpClientFactory>();
            if (httpClientFactory == null)
            {
                System.Diagnostics.Debug.WriteLine("[AuthenticationService] HttpClientFactory not found");
                return false;
            }

            // Используем специальный HttpClient без AuthHandler для refresh запросов
            // Это предотвращает бесконечный цикл при получении 401 во время обновления токена
            var httpClient = httpClientFactory.CreateClient("RefreshTokenClient");
            if (httpClient == null)
            {
                System.Diagnostics.Debug.WriteLine("[AuthenticationService] RefreshTokenClient not found, falling back to ApiClient");
                httpClient = httpClientFactory.CreateClient("ApiClient");
                if (httpClient == null)
                {
                    System.Diagnostics.Debug.WriteLine("[AuthenticationService] HttpClient not found");
                    return false;
                }
            }

            // Создаем запрос для обновления токена
            var requestBody = System.Text.Json.JsonSerializer.Serialize(new { refresh_token = refreshToken });
            var content = new System.Net.Http.StringContent(
                requestBody,
                System.Text.Encoding.UTF8,
                "application/json"
            );

            // Используем централизованную конфигурацию из ApiConfiguration
            var baseUrl = httpClient.BaseAddress?.ToString() 
                ?? ApiConfiguration.GetBaseUrlWithTrailingSlash();
            var request = new System.Net.Http.HttpRequestMessage(
                System.Net.Http.HttpMethod.Post,
                $"{baseUrl.TrimEnd('/')}/api/v1/auth/refresh"
            )
            {
                Content = content
            };

            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var tokenResponse = System.Text.Json.JsonSerializer.Deserialize<TokenResponse>(
                    json,
                    new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }
                );

                if (tokenResponse != null && !string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
                {
                    await SaveTokensAsync(tokenResponse.AccessToken, tokenResponse.RefreshToken);
                    System.Diagnostics.Debug.WriteLine("[AuthenticationService] Token refreshed successfully");
                    return true;
                }
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"[AuthenticationService] Token refresh failed: {response.StatusCode}");
                System.Diagnostics.Debug.WriteLine($"[AuthenticationService] Response body: {responseBody}");
                
                // Если refresh token тоже истек, очищаем токены
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    System.Diagnostics.Debug.WriteLine("[AuthenticationService] Refresh token is invalid or expired, clearing tokens");
                    await ClearTokensAsync();
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[AuthenticationService] Error refreshing token: {ex.Message}");
            return false;
        }
    }

    private class TokenResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("token_type")]
        public string TokenType { get; set; } = "bearer";
    }

    public async Task ClearTokensAsync()
    {
        try
        {
            SecureStorage.Remove(AccessTokenKey);
            SecureStorage.Remove(RefreshTokenKey);
        }
        catch
        {
            // Игнорируем ошибки при очистке
        }
        await Task.CompletedTask;
    }

    public async Task<bool> IsAuthenticatedAsync()
    {
        // Пользователь считается аутентифицированным, если есть access_token ИЛИ refresh_token
        var accessToken = await GetAccessTokenAsync();
        if (!string.IsNullOrWhiteSpace(accessToken))
            return true;

        var refreshToken = await GetRefreshTokenAsync();
        return !string.IsNullOrWhiteSpace(refreshToken);
    }
}

