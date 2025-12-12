namespace YessGoFront.Config;

/// <summary>
/// Настройки приложения (API, таймауты и т.д.)
/// </summary>
public class AppSettings
{
    public ApiSettings Api { get; set; } = new();
    public TimeoutSettings Timeouts { get; set; } = new();
    public DatabaseSettings Database { get; set; } = new();
}

public class DatabaseSettings
{
    /// <summary>
    /// Строка подключения к PostgreSQL
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;
    
    /// <summary>
    /// Включить логирование SQL запросов (для Debug режима)
    /// </summary>
    public bool EnableSqlLogging { get; set; } = false;
}

public class ApiSettings
{
    /// <summary>
    /// Базовый URL API.
    /// По умолчанию используется значение из ApiConfiguration.BASE_URL.
    /// Может быть переопределено через переменную окружения API_BASE_URL.
    /// </summary>
    public string BaseUrl { get; set; } = ApiConfiguration.GetBaseUrlWithTrailingSlash();
    
    /// <summary>
    /// Версия API
    /// </summary>
    public string ApiVersion { get; set; } = ApiConfiguration.API_VERSION;
    
    /// <summary>
    /// Таймаут запросов в секундах
    /// </summary>
    public int RequestTimeoutSeconds { get; set; } = 60;
}

public class TimeoutSettings
{
    public int RequestTimeout { get; set; } = 60;
    public int RetryAttempts { get; set; } = 3;
    public int RetryDelayMs { get; set; } = 1000;
}

