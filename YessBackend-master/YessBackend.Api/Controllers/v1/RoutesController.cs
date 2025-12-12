using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.DTOs.Route;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер маршрутизации
/// Соответствует /api/v1/routes из Python API
/// </summary>
[ApiController]
[Route("api/v1/routes")]
[Tags("Routes")]
[Authorize]
public class RoutesController : ControllerBase
{
    private readonly IRouteService _routeService;
    private readonly ILogger<RoutesController> _logger;

    public RoutesController(
        IRouteService routeService,
        ILogger<RoutesController> logger)
    {
        _routeService = routeService;
        _logger = logger;
    }

    /// <summary>
    /// Расчет маршрута между партнерами
    /// POST /api/v1/routes/calculate
    /// </summary>
    [HttpPost("calculate")]
    [ProducesResponseType(typeof(RouteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<RouteResponseDto>> CalculateRoute([FromBody] RouteRequestDto request)
    {
        try
        {
            var route = await _routeService.CalculateRouteAsync(request);
            return Ok(route);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка расчета маршрута");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка расчета маршрута");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Оптимизация порядка посещения партнеров
    /// POST /api/v1/routes/optimize
    /// </summary>
    [HttpPost("optimize")]
    [ProducesResponseType(typeof(List<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<int>>> OptimizeRoute([FromBody] RouteOptimizationRequestDto request)
    {
        try
        {
            var optimizedRoute = await _routeService.OptimizeRouteAsync(request);
            return Ok(optimizedRoute);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка оптимизации маршрута");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка оптимизации маршрута");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получение навигации между точками
    /// POST /api/v1/routes/navigation
    /// </summary>
    [HttpPost("navigation")]
    [ProducesResponseType(typeof(RouteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<RouteResponseDto>> GetNavigation([FromBody] RouteNavigationRequestDto request)
    {
        try
        {
            var route = await _routeService.GetNavigationAsync(request);
            return Ok(route);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения навигации");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Построение маршрута через OSRM (мок)
    /// POST /api/v1/routes/osrm
    /// </summary>
    [HttpPost("osrm")]
    [ProducesResponseType(typeof(RouteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<RouteResponseDto>> GetOsrmNavigation([FromBody] RouteNavigationRequestDto request)
    {
        try
        {
            var route = await _routeService.GetOsrmNavigationAsync(request);
            return Ok(route);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения OSRM навигации");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Маршрут на общественном транспорте через GraphHopper (мок)
    /// POST /api/v1/routes/transit
    /// </summary>
    [HttpPost("transit")]
    [ProducesResponseType(typeof(RouteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<RouteResponseDto>> GetTransitNavigation([FromBody] RouteNavigationRequestDto request)
    {
        try
        {
            var route = await _routeService.GetTransitNavigationAsync(request);
            return Ok(route);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Транзит провайдер не настроен");
            return StatusCode(503, new { error = "Transit provider is not configured" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзит навигации");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

