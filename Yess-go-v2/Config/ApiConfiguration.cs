namespace YessGoFront.Config;

/// <summary>
/// Централизованная конфигурация API.
/// Все HTTP-запросы идут на этот адрес.
/// </summary>
public static class ApiConfiguration
{
    /// <summary>
    /// Базовый URL API сервера.
    /// Измените этот IP-адрес на адрес вашего сервера.
    /// </summary>
    /// <remarks>
    /// Для изменения адреса сервера отредактируйте эту константу.
    /// Формат: http://IP:PORT или https://IP:PORT
    /// </remarks>
    public const string BASE_URL = "http://5.59.232.211:8000";

    /// <summary>
    /// Версия API
    /// </summary>
    public const string API_VERSION = "v1";

    /// <summary>
    /// Полный базовый URL с версией API
    /// </summary>
    public const string BASE_URL_WITH_VERSION = $"{BASE_URL}/api/{API_VERSION}";

    /// <summary>
    /// Получить базовый URL с учетом возможной переменной окружения.
    /// Если установлена переменная окружения API_BASE_URL, она будет использована.
    /// Иначе используется константа BASE_URL.
    /// </summary>
    public static string GetBaseUrl()
    {
        var envUrl = Environment.GetEnvironmentVariable("API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(envUrl))
        {
            return envUrl.TrimEnd('/');
        }

        return BASE_URL;
    }

    /// <summary>
    /// Получить базовый URL с завершающим слешем для использования в HttpClient.BaseAddress
    /// </summary>
    public static string GetBaseUrlWithTrailingSlash()
    {
        var baseUrl = GetBaseUrl();
        return baseUrl.EndsWith("/") ? baseUrl : $"{baseUrl}/";
    }
}

