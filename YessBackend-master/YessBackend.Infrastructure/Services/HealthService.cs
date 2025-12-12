using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис проверки здоровья системы
/// Проверяет подключение к БД и Redis
/// </summary>
public class HealthService : IHealthService
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache? _cache;
    private readonly ILogger<HealthService> _logger;

    public HealthService(
        ApplicationDbContext context,
        IDistributedCache? cache,
        ILogger<HealthService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<HealthStatusDto> CheckHealthAsync()
    {
        var healthStatus = new HealthStatusDto
        {
            Service = "yess-backend",
            Version = "1.0.0"
        };

        // Проверка подключения к БД
        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1");
            healthStatus.Database = "connected";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            healthStatus.Database = "disconnected";
        }

        // Проверка подключения к Redis через DistributedCache
        try
        {
            if (_cache != null)
            {
                // Пробуем установить и получить значение для проверки подключения
                await _cache.SetStringAsync("health_check", "ok", new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1)
                });
                await _cache.GetStringAsync("health_check");
                healthStatus.Cache = "connected";
            }
            else
            {
                healthStatus.Cache = "not_configured";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache health check failed");
            healthStatus.Cache = "disconnected";
        }

        // Определяем общий статус
        healthStatus.Status = healthStatus.Database == "connected" && 
                             (healthStatus.Cache == "connected" || healthStatus.Cache == "not_configured")
            ? "healthy"
            : "degraded";

        return healthStatus;
    }
}

