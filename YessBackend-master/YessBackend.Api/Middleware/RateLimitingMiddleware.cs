using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using System.Text;

namespace YessBackend.Api.Middleware;

/// <summary>
/// Rate Limiting Middleware
/// Соответствует rate_limit.py из Python API
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IDistributedCache _cache;
    private readonly RateLimitingOptions _options;

    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IDistributedCache cache,
        RateLimitingOptions options)
    {
        _next = next;
        _logger = logger;
        _cache = cache;
        _options = options;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Пропускаем health check endpoints
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/"))
        {
            await _next(context);
            return;
        }

        if (!_options.Enabled)
        {
            await _next(context);
            return;
        }

        var clientId = GetClientIdentifier(context);
        var endpoint = $"{context.Request.Method}:{context.Request.Path}";
        var key = $"ratelimit:{clientId}:{endpoint}";

        var currentCount = await GetCurrentCountAsync(key);
        var limit = _options.RequestsPerMinute;

        if (currentCount >= limit)
        {
            _logger.LogWarning($"Rate limit exceeded for {clientId} on {endpoint}");
            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/json";

            var retryAfter = await GetTtlAsync(key);
            context.Response.Headers["Retry-After"] = retryAfter.ToString();

            var response = new
            {
                error = "Too Many Requests",
                message = $"Rate limit exceeded. Maximum {limit} requests per minute.",
                retry_after = retryAfter
            };

            var json = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(json);
            return;
        }

        // Увеличиваем счетчик
        await IncrementCounterAsync(key);

        // Добавляем заголовки с информацией о rate limit
        context.Response.Headers["X-RateLimit-Limit"] = limit.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = (limit - currentCount - 1).ToString();

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Используем IP адрес как идентификатор клиента
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        // Можно добавить идентификатор пользователя из JWT токена
        var userId = context.User?.FindFirst("user_id")?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            return $"user:{userId}";
        }

        return $"ip:{ipAddress}";
    }

    private async Task<int> GetCurrentCountAsync(string key)
    {
        try
        {
            var value = await _cache.GetStringAsync(key);
            return string.IsNullOrEmpty(value) ? 0 : int.Parse(value);
        }
        catch
        {
            return 0;
        }
    }

    private async Task IncrementCounterAsync(string key)
    {
        try
        {
            var currentCount = await GetCurrentCountAsync(key);
            var newCount = currentCount + 1;
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
            };
            await _cache.SetStringAsync(key, newCount.ToString(), options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error incrementing rate limit counter for key: {key}");
        }
    }

    private Task<int> GetTtlAsync(string key)
    {
        // Redis TTL в секундах
        // Для упрощения возвращаем 60 секунд
        return Task.FromResult(60);
    }
}

public class RateLimitingOptions
{
    public bool Enabled { get; set; } = true;
    public int RequestsPerMinute { get; set; } = 100;
    public int RequestsPerHour { get; set; } = 1000;
}

public static class RateLimitingMiddlewareExtensions
{
    public static IApplicationBuilder UseRateLimiting(
        this IApplicationBuilder builder,
        IConfiguration configuration)
    {
        var options = new RateLimitingOptions
        {
            Enabled = configuration.GetValue<bool>("RateLimiting:Enabled", true),
            RequestsPerMinute = configuration.GetValue<int>("RateLimiting:RequestsPerMinute", 100),
            RequestsPerHour = configuration.GetValue<int>("RateLimiting:RequestsPerHour", 1000)
        };

        return builder.UseMiddleware<RateLimitingMiddleware>(options);
    }
}
