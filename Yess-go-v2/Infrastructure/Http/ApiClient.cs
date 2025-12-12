using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Config;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.Infrastructure.Http;

/// <summary>
/// Базовый класс для всех API клиентов
/// </summary>
public abstract class ApiClient
{
    protected readonly HttpClient HttpClient;
    protected readonly ILogger? Logger;
    protected readonly JsonSerializerOptions JsonOptions;

    protected ApiClient(HttpClient httpClient, ILogger? logger = null)
    {
        HttpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        Logger = logger;

        // ✅ Принудительно используем HTTP/1.1 (фикс "ResponseEnded" на Android/.NET 8/9)
        HttpClient.DefaultRequestVersion = new Version(1, 1);
        HttpClient.DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower;

        // ✅ BaseAddress должен быть установлен в MauiProgram.cs через HttpClient конфигурацию
        // Проверяем, что BaseAddress установлен
        if (HttpClient.BaseAddress == null)
        {
            // Если BaseAddress не установлен, используем значение из ApiConfiguration
            var defaultUrl = ApiConfiguration.GetBaseUrlWithTrailingSlash();
            HttpClient.BaseAddress = new Uri(defaultUrl);
            Logger?.LogWarning("[ApiClient] BaseAddress не был установлен через DI, используется значение по умолчанию: {Url}", defaultUrl);
        }
        
        // Логируем используемый URL для отладки
        Logger?.LogInformation("[ApiClient] Using BaseAddress: {BaseAddress}", HttpClient.BaseAddress);
        
        // Убеждаемся, что BaseAddress заканчивается на "/"
        if (!HttpClient.BaseAddress.ToString().EndsWith("/"))
        {
            HttpClient.BaseAddress = new Uri(HttpClient.BaseAddress + "/");
        }
        
#if ANDROID
        Android.Util.Log.Info("ApiClient", $"BaseAddress установлен: {HttpClient.BaseAddress}");
        System.Diagnostics.Debug.WriteLine($"[ApiClient] BaseAddress: {HttpClient.BaseAddress}");
#endif

        JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            // НЕ используем PropertyNamingPolicy.CamelCase, так как модели используют [JsonPropertyName] для точного указания имён полей
            // PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    protected Uri BuildUri(string endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
            throw new ArgumentException("Endpoint is empty", nameof(endpoint));

        endpoint = endpoint.TrimStart('/');
        return new Uri(HttpClient.BaseAddress!, endpoint);
    }

    protected async Task<TResponse> GetAsync<TResponse>(string endpoint, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("GET {Url}", uri);

            var response = await HttpClient.GetAsync(uri, ct);
            await EnsureSuccessStatusCode(response);

            // Читаем JSON как строку для логирования и десериализации
            var jsonContent = await response.Content.ReadAsStringAsync(ct);
            
            // Для отладки: логируем сырой JSON ответ (для партнёров и баннеров)
            if (endpoint.Contains("partners", StringComparison.OrdinalIgnoreCase) || endpoint.Contains("banners", StringComparison.OrdinalIgnoreCase))
            {
                var entityType = endpoint.Contains("partners", StringComparison.OrdinalIgnoreCase) ? "Partners" : "Banners";
#if ANDROID
                var preview = jsonContent.Length > 5000 ? jsonContent.Substring(0, 5000) + "..." : jsonContent;
                Android.Util.Log.Info("ApiClient", $"[GetAsync] {entityType} API JSON response (first 5000 chars):\n{preview}");
                // Также логируем полный JSON, если он не слишком большой
                if (jsonContent.Length <= 10000)
                {
                    Android.Util.Log.Info("ApiClient", $"[GetAsync] {entityType} API FULL JSON response:\n{jsonContent}");
                }
#endif
                System.Diagnostics.Debug.WriteLine($"[ApiClient] {entityType} API response (first 5000 chars): {(jsonContent.Length > 5000 ? jsonContent.Substring(0, 5000) + "..." : jsonContent)}");
                Logger?.LogInformation("[ApiClient] {EntityType} API response (first 1000 chars): {Json}", 
                    entityType, jsonContent.Length > 1000 ? jsonContent.Substring(0, 1000) + "..." : jsonContent);
            }

            // Десериализуем из строки
            var result = System.Text.Json.JsonSerializer.Deserialize<TResponse>(jsonContent, JsonOptions);
            if (result == null)
            {
                throw new ApiException("Не удалось десериализовать ответ сервера");
            }
            
            return result;
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task<TResponse> PostAsync<TRequest, TResponse>(string endpoint, TRequest request, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("POST {Url}", uri);
            Logger?.LogInformation("[ApiClient] Attempting POST to: {Url}", uri);

            var content = JsonContent.Create(request, options: JsonOptions);
            var response = await HttpClient.PostAsync(uri, content, ct);
            await EnsureSuccessStatusCode(response);

            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct)
                   ?? throw new ApiException("Не удалось десериализовать ответ сервера");
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            var uri = BuildUri(endpoint);
            Logger?.LogError(ex, "[ApiClient] Network error during POST to {Url}: {Message}", uri, ex.Message);
            
            // Детальная информация об ошибке
            var errorDetails = ex switch
            {
                HttpRequestException httpEx => $"HTTP Error: {httpEx.Message}",
                System.Net.Sockets.SocketException sockEx => $"Socket Error: {sockEx.Message} (ErrorCode: {sockEx.ErrorCode})",
                TaskCanceledException => "Request timeout - сервер не отвечает",
                _ => ex.Message
            };
            
            throw new NetworkException($"Ошибка сети при подключении к {uri.Host}: {errorDetails}", ex);
        }
    }

    protected async Task PostAsync<TRequest>(string endpoint, TRequest request, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("POST {Url}", uri);

            var content = JsonContent.Create(request, options: JsonOptions);
            var response = await HttpClient.PostAsync(uri, content, ct);
            await EnsureSuccessStatusCode(response);
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task<TResponse> PutAsync<TRequest, TResponse>(string endpoint, TRequest request, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("PUT {Url}", uri);

            var content = JsonContent.Create(request, options: JsonOptions);
            var response = await HttpClient.PutAsync(uri, content, ct);
            await EnsureSuccessStatusCode(response);

            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct)
                   ?? throw new ApiException("Не удалось десериализовать ответ сервера");
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task<TResponse> PatchAsync<TRequest, TResponse>(string endpoint, TRequest request, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("PATCH {Url}", uri);

            var content = JsonContent.Create(request, options: JsonOptions);
            var response = await HttpClient.PatchAsync(uri, content, ct);
            await EnsureSuccessStatusCode(response);

            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct)
                   ?? throw new ApiException("Не удалось десериализовать ответ сервера");
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task PatchAsync<TRequest>(string endpoint, TRequest request, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("PATCH {Url}", uri);

            var content = JsonContent.Create(request, options: JsonOptions);
            var response = await HttpClient.PatchAsync(uri, content, ct);
            await EnsureSuccessStatusCode(response);
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task DeleteAsync(string endpoint, CancellationToken ct = default)
    {
        try
        {
            var uri = BuildUri(endpoint);
            Logger?.LogDebug("DELETE {Url}", uri);

            var response = await HttpClient.DeleteAsync(uri, ct);
            await EnsureSuccessStatusCode(response);
        }
        catch (Exception ex) when (NetworkException.IsNetworkError(ex))
        {
            throw new NetworkException("Ошибка сети. Проверьте подключение к интернету.", ex);
        }
    }

    protected async Task EnsureSuccessStatusCode(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
            return;

        var errorContent = await response.Content.ReadAsStringAsync();
        Logger?.LogError("API Error: {StatusCode} - {Content}", response.StatusCode, errorContent);

        // Извлекаем сообщение из JSON ответа
        var errorMessage = ExtractErrorMessage(errorContent);

        throw response.StatusCode switch
        {
            HttpStatusCode.Unauthorized => new UnauthorizedException(errorMessage ?? "Требуется авторизация"),
            HttpStatusCode.Forbidden => new ForbiddenException(errorMessage ?? "Доступ запрещён"),
            HttpStatusCode.NotFound => new NotFoundException(errorMessage ?? "Ресурс не найден"),
            HttpStatusCode.BadRequest => new BadRequestException(errorMessage ?? "Неверный запрос", errorContent),
            HttpStatusCode.InternalServerError or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable
                => new ServerException(errorMessage ?? "Ошибка сервера", response.StatusCode),
            _ => new ApiException(errorMessage ?? $"API error: {response.StatusCode}", response.StatusCode)
        };
    }

    private static string? ExtractErrorMessage(string? errorContent)
    {
        if (string.IsNullOrWhiteSpace(errorContent))
            return null;

        try
        {
            // Пытаемся распарсить JSON и извлечь поле "message", "error" или "detail"
            using var doc = System.Text.Json.JsonDocument.Parse(errorContent);
            
            // Проверяем "message"
            if (doc.RootElement.TryGetProperty("message", out var messageElement))
            {
                var message = messageElement.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                    return message;
            }
            
            // Проверяем "error" (некоторые API возвращают ошибки в этом поле)
            if (doc.RootElement.TryGetProperty("error", out var errorElement))
            {
                var error = errorElement.GetString();
                if (!string.IsNullOrWhiteSpace(error))
                    return error;
            }
            
            // Проверяем "detail"
            if (doc.RootElement.TryGetProperty("detail", out var detailElement))
            {
                var detail = detailElement.GetString();
                if (!string.IsNullOrWhiteSpace(detail))
                    return detail;
            }
        }
        catch
        {
            // Если не удалось распарсить JSON, возвращаем null
        }

        return null;
    }
}
