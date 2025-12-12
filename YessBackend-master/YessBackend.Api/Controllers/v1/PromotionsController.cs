using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер акций и промо-кодов
/// Соответствует /api/v1/promotions из Python API
/// </summary>
[ApiController]
[Route("api/v1/promotions")]
[Tags("Promotions")]
public class PromotionsController : ControllerBase
{
    private readonly IPromotionService _promotionService;
    private readonly ILogger<PromotionsController> _logger;

    public PromotionsController(
        IPromotionService promotionService,
        ILogger<PromotionsController> logger)
    {
        _promotionService = promotionService;
        _logger = logger;
    }

    /// <summary>
    /// Получить активные акции
    /// GET /api/v1/promotions
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetActivePromotions(
        [FromQuery] int? partner_id = null,
        [FromQuery] int? city_id = null)
    {
        try
        {
            var promotions = await _promotionService.GetActivePromotionsAsync(partner_id, city_id);
            return Ok(promotions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения активных акций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить акцию по ID
    /// GET /api/v1/promotions/{promotion_id}
    /// </summary>
    [HttpGet("{promotion_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetPromotion([FromRoute] int promotion_id)
    {
        try
        {
            var promotion = await _promotionService.GetPromotionByIdAsync(promotion_id);
            if (promotion == null)
            {
                return NotFound(new { error = "Акция не найдена" });
            }

            return Ok(promotion);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения акции");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить промо-коды
    /// GET /api/v1/promotions/promo-codes
    /// </summary>
    [HttpGet("promo-codes")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetPromoCodes([FromQuery] int? partner_id = null)
    {
        try
        {
            var promoCodes = await _promotionService.GetPromoCodesAsync(partner_id);
            return Ok(promoCodes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кодов");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить промо-код по коду
    /// GET /api/v1/promotions/promo-codes/{code}
    /// </summary>
    [HttpGet("promo-codes/{code}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetPromoCodeByCode([FromRoute] string code)
    {
        try
        {
            var promoCode = await _promotionService.GetPromoCodeByCodeAsync(code);
            if (promoCode == null)
            {
                return NotFound(new { error = "Промо-код не найден" });
            }

            return Ok(promoCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Применить промо-код
    /// POST /api/v1/promotions/apply-code
    /// </summary>
    [HttpPost("apply-code")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> ApplyPromoCode(
        [FromBody] ApplyPromoCodeRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var result = await _promotionService.ApplyPromoCodeAsync(userId.Value, request.Code, request.OrderId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка применения промо-кода");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка применения промо-кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить промо-коды пользователя
    /// GET /api/v1/promotions/user/{user_id}/promo-codes
    /// </summary>
    [HttpGet("user/{user_id}/promo-codes")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetUserPromoCodes([FromRoute] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var promoCodes = await _promotionService.GetUserPromoCodesAsync(user_id);
            return Ok(promoCodes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кодов пользователя");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Создать промо-код
    /// POST /api/v1/promotions/promo-codes
    /// </summary>
    [HttpPost("promo-codes")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CreatePromoCode([FromBody] CreatePromoCodeRequest request)
    {
        try
        {
            var result = await _promotionService.CreatePromoCodeAsync(
                request.Code, 
                request.PartnerId, 
                request.ValidUntil);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания промо-кода");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания промо-кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Проверить промо-код
    /// POST /api/v1/promotions/validate-code
    /// </summary>
    [HttpPost("validate-code")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> ValidatePromoCode([FromBody] ValidatePromoCodeRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var result = await _promotionService.ValidatePromoCodeAsync(request.Code, userId.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки промо-кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Статистика акций
    /// GET /api/v1/promotions/stats
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetPromotionStats()
    {
        try
        {
            var stats = await _promotionService.GetPromotionStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики акций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Проверить использование промо-кода
    /// GET /api/v1/promotions/check-usage/{code}
    /// </summary>
    [HttpGet("check-usage/{code}")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> CheckPromoCodeUsage([FromRoute] string code)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var result = await _promotionService.CheckPromoCodeUsageAsync(userId.Value, code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки использования промо-кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }

    public class ApplyPromoCodeRequest
    {
        public string Code { get; set; } = string.Empty;
        public int? OrderId { get; set; }
    }

    public class CreatePromoCodeRequest
    {
        public string Code { get; set; } = string.Empty;
        public int? PartnerId { get; set; }
        public DateTime? ValidUntil { get; set; }
    }

    public class ValidatePromoCodeRequest
    {
        public string Code { get; set; } = string.Empty;
    }
}

