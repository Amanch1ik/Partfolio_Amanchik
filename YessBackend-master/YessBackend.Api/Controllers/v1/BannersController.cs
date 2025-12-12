using Microsoft.AspNetCore.Mvc;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер баннеров (заглушка)
/// Соответствует /api/v1/banners из Python API
/// </summary>
[ApiController]
[Route("api/v1/banners")]
[Tags("Banners")]
public class BannersController : ControllerBase
{
    private readonly ILogger<BannersController> _logger;

    public BannersController(ILogger<BannersController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Получить активные баннеры
    /// GET /api/v1/banners
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public ActionResult GetBanners(
        [FromQuery] int? city_id = null,
        [FromQuery] int? partner_id = null)
    {
        try
        {
            // Заглушка - возвращаем пустой список
            _logger.LogInformation("GetBanners called: CityId={CityId}, PartnerId={PartnerId}", city_id, partner_id);
            
            return Ok(new
            {
                items = new List<object>(),
                total = 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения баннеров");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

