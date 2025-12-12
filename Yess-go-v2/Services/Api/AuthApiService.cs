using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Models;

namespace YessGoFront.Services.Api
{
    /// <summary>
    /// Реализация API сервиса для аутентификации
    /// </summary>
    public class AuthApiService : ApiClient, IAuthApiService
    {
        public AuthApiService(HttpClient httpClient, ILogger<AuthApiService>? logger = null)
            : base(httpClient, logger)
        {
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
        {
            try
            {
                // Используем JSON для логина (backend принимает JSON на /api/v1/auth/login)
                var loginDto = new UserLoginDto
                {
                    Phone = request.Username,  // Backend ожидает поле "phone" в JSON
                    Password = request.Password
                };

                Logger?.LogInformation("[AuthApiService] Attempting login for phone: {Phone}", request.Username);
                Logger?.LogDebug("[AuthApiService] BaseAddress: {BaseAddress}", HttpClient.BaseAddress);

                // Используем базовый метод PostAsync, который отправляет JSON
                // Endpoint: /api/v1/auth/login (без /json суффикса)
                var tokenResponse = await PostAsync<UserLoginDto, TokenResponseDto>(
                    ApiEndpoints.AuthEndpoints.Login,
                    loginDto,
                    ct
                );

                // Конвертируем TokenResponseDto в AuthResponse
                var authResponse = new AuthResponse
                {
                    AccessToken = tokenResponse.AccessToken,
                    RefreshToken = tokenResponse.RefreshToken,
                    TokenType = tokenResponse.TokenType ?? "bearer"
                };
                
                Logger?.LogInformation("Login successful. AccessToken: {HasAccess}, RefreshToken: {HasRefresh}", 
                    !string.IsNullOrEmpty(authResponse.AccessToken), 
                    !string.IsNullOrEmpty(authResponse.RefreshToken));
                return authResponse;
            }
            catch (Exception ex) when (IsNetworkError(ex))
            {
                Logger?.LogError(ex, "[AuthApiService] Network error during login: {Message}", ex.Message);
                throw new NetworkException($"Ошибка сети при входе: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// DTO для отправки логина в JSON формате
        /// </summary>
        private class UserLoginDto
        {
            [System.Text.Json.Serialization.JsonPropertyName("phone")]
            public string Phone { get; set; } = string.Empty;
            
            [System.Text.Json.Serialization.JsonPropertyName("password")]
            public string Password { get; set; } = string.Empty;
        }



        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
        {
            try
            {
                var requestBody = new { refresh_token = refreshToken };
                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var uri = BuildUri(ApiEndpoints.AuthEndpoints.Refresh);
                Logger?.LogDebug("➡️ POST {Url} (refresh token)", uri);

                var response = await HttpClient.PostAsync(uri, content, ct);

                if (!response.IsSuccessStatusCode)
                    throw await MapToApiExceptionAsync(response, "Ошибка обновления токена");

                var json = await response.Content.ReadAsStringAsync(ct);
                return JsonSerializer.Deserialize<AuthResponse>(json, JsonOptions)
                       ?? throw new ApiException("Ошибка при разборе ответа refresh токена");
            }
            catch (Exception ex) when (IsNetworkError(ex))
            {
                throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
            }
        }

        // ❌ Пока нет такого эндпоинта на backend
        public Task LogoutAsync(CancellationToken ct = default)
        {
            throw new NotSupportedException("Эндпоинт /auth/logout отсутствует на сервере.");
        }

        // ❌ Этого эндпоинта тоже нет сейчас
        public Task<AuthResponse> VerifyCodeAsync(string code, CancellationToken ct = default)
        {
            throw new NotSupportedException("Эндпоинт /auth/verify отсутствует на сервере.");
        }

        public async Task<Dictionary<string, object>> SendVerificationCodeAsync(string phoneNumber, CancellationToken ct = default)
        {
            try
            {
                var request = new VerificationCodeRequest { phone_number = phoneNumber };
                var response = await PostAsync<VerificationCodeRequest, Dictionary<string, object>>(
                    $"{ApiEndpoints.AuthEndpoints.Base}/send-verification-code",
                    request,
                    ct
                );
                return response;
            }
            catch (Exception ex) when (IsNetworkError(ex))
            {
                throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
            }
        }

        public async Task<UserDto> VerifyCodeAndRegisterAsync(VerifyCodeRequest request, CancellationToken ct = default)
        {
            try
            {
                return await PostAsync<VerifyCodeRequest, UserDto>(
                    $"{ApiEndpoints.AuthEndpoints.Base}/verify-code",
                    request,
                    ct
                );
            }
            catch (Exception ex) when (IsNetworkError(ex))
            {
                throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
            }
        }

        public async Task<UserDto> GetMeAsync(CancellationToken ct = default)
        {
            try
            {
                // Получаем JSON ответ напрямую для отладки
                var uri = BuildUri($"{ApiEndpoints.AuthEndpoints.Base}/me");
                Logger?.LogDebug("GET {Url}", uri);
                
                var response = await HttpClient.GetAsync(uri, ct);
                var jsonContent = await response.Content.ReadAsStringAsync(ct);
                
                // Логируем ответ независимо от статуса
                Logger?.LogInformation("GetMeAsync response: Status={StatusCode}, Body={Json}", response.StatusCode, jsonContent);
                
                // Проверяем статус код после логирования
                await EnsureSuccessStatusCode(response);
                
                // Десериализуем вручную - используем DefaultJsonSerializerOptions без PropertyNamingPolicy
                // Это позволит использовать только JsonPropertyName атрибуты
                var jsonOptions = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = null // Отключаем camelCase, используем только JsonPropertyName атрибуты
                };
                
                var userDto = System.Text.Json.JsonSerializer.Deserialize<UserDto>(jsonContent, jsonOptions);
                
                if (userDto == null)
                {
                    throw new ApiException("Не удалось десериализовать ответ /me");
                }
                
                // Логируем полученные данные для отладки
                Logger?.LogInformation("GetMeAsync deserialized: Id={Id}, FirstName='{FirstName}', LastName='{LastName}', Phone='{Phone}'", 
                    userDto.Id, userDto.FirstName ?? "null", userDto.LastName ?? "null", userDto.Phone ?? "null");
                
                // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: если FirstName/LastName пустые, попробуем прочитать напрямую из JSON
                if (string.IsNullOrWhiteSpace(userDto.FirstName) && string.IsNullOrWhiteSpace(userDto.LastName))
                {
                    try
                    {
                        using var jsonDoc = System.Text.Json.JsonDocument.Parse(jsonContent);
                        var root = jsonDoc.RootElement;
                        
                        if (root.TryGetProperty("firstName", out var firstNameProp))
                        {
                            userDto.FirstName = firstNameProp.GetString() ?? string.Empty;
                            Logger?.LogWarning("GetMeAsync: Manually extracted firstName from JSON: '{FirstName}'", userDto.FirstName);
                        }
                        
                        if (root.TryGetProperty("lastName", out var lastNameProp))
                        {
                            userDto.LastName = lastNameProp.GetString() ?? string.Empty;
                            Logger?.LogWarning("GetMeAsync: Manually extracted lastName from JSON: '{LastName}'", userDto.LastName);
                        }
                        
                        if (root.TryGetProperty("phone", out var phoneProp))
                        {
                            var phoneValue = phoneProp.GetString();
                            if (!string.IsNullOrWhiteSpace(phoneValue) && string.IsNullOrWhiteSpace(userDto.Phone))
                            {
                                userDto.Phone = phoneValue;
                                Logger?.LogWarning("GetMeAsync: Manually extracted phone from JSON: '{Phone}'", userDto.Phone);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger?.LogWarning(ex, "GetMeAsync: Failed to manually extract properties from JSON");
                    }
                }
                
                return userDto;
            }
            catch (Exception ex) when (IsNetworkError(ex))
            {
                throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
            }
        }


        // ----------------- Helpers -----------------

        /// <summary>
        /// Промежуточный класс для десериализации ответа от backend (camelCase)
        /// </summary>
        private class TokenResponseDto
        {
            [System.Text.Json.Serialization.JsonPropertyName("accessToken")]
            public string AccessToken { get; set; } = string.Empty;
            
            [System.Text.Json.Serialization.JsonPropertyName("refreshToken")]
            public string RefreshToken { get; set; } = string.Empty;
            
            [System.Text.Json.Serialization.JsonPropertyName("tokenType")]
            public string? TokenType { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("expiresIn")]
            public int ExpiresIn { get; set; }
        }

        private static bool IsNetworkError(Exception ex) =>
            ex is HttpRequestException
            or SocketException
            or IOException
            or TaskCanceledException
            || ex.InnerException is SocketException
            || ex.InnerException is IOException;

        private static async Task<ApiException> MapToApiExceptionAsync(HttpResponseMessage response, string defaultMessage)
        {
            var status = response.StatusCode;
            var text = defaultMessage;

            try
            {
                var body = await response.Content.ReadAsStringAsync();
                if (!string.IsNullOrWhiteSpace(body))
                    text = $"{defaultMessage}: {body}";
            }
            catch { }

            return status switch
            {
                HttpStatusCode.Unauthorized => new UnauthorizedException("Неверные учетные данные"),
                HttpStatusCode.Forbidden => new ForbiddenException("Доступ запрещён"),
                HttpStatusCode.NotFound => new NotFoundException("Ресурс не найден"),
                HttpStatusCode.BadRequest => new BadRequestException("Неверный запрос", text),
                _ when (int)status >= 500 => new ServerException("Ошибка сервера", status),
                _ => new ApiException(text, status)
            };
        }
    }
}
