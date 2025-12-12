using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер проверки здоровья системы
/// Соответствует /api/v1/health из Python API
/// </summary>
[ApiController]
[Route("api/v1/health")]
[Tags("Health")]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IHealthService healthService,
        ILogger<HealthController> logger)
    {
        _healthService = healthService;
        _logger = logger;
    }

    /// <summary>
    /// Проверка здоровья системы
    /// GET /api/v1/health
    /// Проверяет подключение к БД и Redis
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(HealthStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<HealthStatusDto>> GetHealth()
    {
        try
        {
            var healthStatus = await _healthService.CheckHealthAsync();
            return Ok(healthStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking health status");
            return StatusCode(500, new HealthStatusDto
            {
                Status = "error",
                Service = "yess-backend",
                Version = "1.0.0",
                Database = "unknown",
                Cache = "unknown"
            });
        }
    }
}

