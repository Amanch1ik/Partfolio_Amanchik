using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Auth;

namespace YessGoFront.Infrastructure.Http.HttpMessageHandlers;

/// <summary>
/// HTTP Handler для автоматического добавления Authorization заголовка
/// </summary>
public class AuthHandler : DelegatingHandler
{
    private readonly IAuthenticationService _authService;
    private readonly ILogger<AuthHandler>? _logger;

    public AuthHandler(
        IAuthenticationService authService,
        ILogger<AuthHandler>? logger = null)
    {
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var token = await _authService.GetAccessTokenAsync();
        
        // Проактивная проверка и обновление токена перед запросом
        if (!string.IsNullOrEmpty(token) && await IsTokenExpiringSoonAsync(token))
        {
            _logger?.LogDebug("Token expiring soon, refreshing proactively");
            var refreshed = await _authService.RefreshTokenAsync();
            if (refreshed)
            {
                token = await _authService.GetAccessTokenAsync();
                _logger?.LogDebug("Token refreshed proactively");
            }
        }
        
        // Добавляем токен к запросу, если он есть
        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            _logger?.LogDebug("Added Bearer token to request {Uri}", request.RequestUri);
        }

        var response = await base.SendAsync(request, cancellationToken);

        // Обработка 401 - попытка обновить токен (fallback)
        // НЕ пытаемся обновить токен, если запрос уже к endpoint refresh - это предотвращает бесконечный цикл
        var isRefreshRequest = request.RequestUri?.AbsolutePath.Contains("/auth/refresh", StringComparison.OrdinalIgnoreCase) ?? false;
        
        if (response.StatusCode == HttpStatusCode.Unauthorized && !isRefreshRequest)
        {
            _logger?.LogWarning("Received 401 Unauthorized, attempting token refresh");
            
            var refreshed = await _authService.RefreshTokenAsync();
            if (refreshed)
            {
                // Повторяем запрос с новым токеном
                token = await _authService.GetAccessTokenAsync();
                if (!string.IsNullOrEmpty(token))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    response = await base.SendAsync(request, cancellationToken);
                    _logger?.LogDebug("Retried request after token refresh");
                }
            }
            else
            {
                _logger?.LogWarning("Token refresh failed, user needs to re-authenticate");
            }
        }

        return response;
    }

    private async Task<bool> IsTokenExpiringSoonAsync(string token)
    {
        try
        {
            // Декодируем JWT без проверки подписи (только для чтения exp)
            var parts = token.Split('.');
            if (parts.Length != 3) return false;
            
            var payload = parts[1];
            // Добавляем padding если нужно
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }
            
            var jsonBytes = Convert.FromBase64String(payload);
            var json = System.Text.Encoding.UTF8.GetString(jsonBytes);
            var doc = System.Text.Json.JsonDocument.Parse(json);
            
            if (doc.RootElement.TryGetProperty("exp", out var expElement))
            {
                var exp = expElement.GetInt64();
                var expTime = DateTimeOffset.FromUnixTimeSeconds(exp);
                var timeUntilExpiry = expTime - DateTimeOffset.UtcNow;
                
                // Обновляем, если токен истечет в течение 5 минут
                return timeUntilExpiry.TotalMinutes < 5;
            }
        }
        catch (Exception ex)
        {
            // Если не удалось декодировать, считаем что нужно обновить
            _logger?.LogWarning(ex, "Failed to decode token expiration, will attempt refresh");
            return true;
        }
        
        return false;
    }
}

