using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер унифицированного API
/// Соответствует /api/v1/unified из Python API
/// </summary>
[ApiController]
[Route("api/v1/unified")]
[Tags("Unified API")]
[Authorize]
public class UnifiedController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPartnerService _partnerService;
    private readonly IRouteService _routeService;
    private readonly IWalletService _walletService;
    private readonly ILogger<UnifiedController> _logger;

    public UnifiedController(
        ApplicationDbContext context,
        IPartnerService partnerService,
        IRouteService routeService,
        IWalletService walletService,
        ILogger<UnifiedController> logger)
    {
        _context = context;
        _partnerService = partnerService;
        _routeService = routeService;
        _walletService = walletService;
        _logger = logger;
    }

    /// <summary>
    /// Получить рекомендации партнеров
    /// GET /api/v1/unified/recommendations
    /// </summary>
    [HttpGet("recommendations")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetPartnerRecommendations(
        [FromQuery] int? city_id = null,
        [FromQuery] int limit = 10)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user != null && !city_id.HasValue && user.CityId.HasValue)
            {
                city_id = user.CityId.Value;
            }

            // Получаем активных партнеров
            var partners = await _context.Partners
                .Where(p => p.IsActive && (city_id == null || p.CityId == city_id))
                .OrderByDescending(p => p.IsVerified)
                .ThenByDescending(p => p.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return Ok(new
            {
                items = partners.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    category = p.Category,
                    logo_url = p.LogoUrl,
                    rating = 0.0, // Partner не имеет Rating
                    cashback_rate = p.CashbackRate
                }),
                total = partners.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения рекомендаций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Рассчитать маршрут
    /// GET /api/v1/unified/route
    /// </summary>
    [HttpGet("route")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> CalculateRoute(
        [FromQuery] string partner_location_ids)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Парсим список ID локаций
            var locationIds = partner_location_ids.Split(',')
                .Select(id => int.TryParse(id.Trim(), out var locId) ? locId : (int?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToList();

            if (locationIds.Count < 2)
            {
                return BadRequest(new { error = "Требуется минимум две локации" });
            }

            var requestDto = new Application.DTOs.Route.RouteRequestDto
            {
                PartnerLocationIds = locationIds,
                TransportMode = Application.DTOs.Route.TransportMode.DRIVING,
                OptimizeRoute = true
            };

            var route = await _routeService.CalculateRouteAsync(requestDto);
            return Ok(route);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка расчета маршрута");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить баланс кошелька
    /// GET /api/v1/unified/wallet
    /// </summary>
    [HttpGet("wallet")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetWallet()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var wallet = await _walletService.GetWalletByUserIdAsync(userId.Value);
            if (wallet == null)
            {
                return Ok(new
                {
                    balance = 0.0m,
                    yescoin_balance = 0.0m,
                    total_earned = 0.0m,
                    total_spent = 0.0m
                });
            }

            return Ok(new
            {
                balance = wallet.Balance,
                yescoin_balance = wallet.YescoinBalance,
                total_earned = wallet.TotalEarned,
                total_spent = wallet.TotalSpent
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения кошелька");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить активные акции
    /// GET /api/v1/unified/promotions
    /// </summary>
    [HttpGet("promotions")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetActivePromotions(
        [FromQuery] int? partner_id = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var now = DateTime.UtcNow;
            var query = _context.Promotions
                .Where(p => p.IsActive && 
                           (p.ValidUntil == null || p.ValidUntil >= now));

            if (partner_id.HasValue)
            {
                query = query.Where(p => p.PartnerId == partner_id.Value);
            }

            var promotions = await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return Ok(new
            {
                items = promotions.Select(p => new
                {
                    id = p.Id,
                    title = p.Title,
                    description = p.Description,
                    partner_id = p.PartnerId,
                    valid_until = p.ValidUntil,
                    created_at = p.CreatedAt
                }),
                total = promotions.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения акций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить близлежащих партнеров
    /// GET /api/v1/unified/nearby-partners
    /// </summary>
    [HttpGet("nearby-partners")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetNearbyPartners(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radius_km = 5.0,
        [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Получаем все локации партнеров
            var locations = await _context.PartnerLocations
                .Where(l => l.IsActive && 
                           l.Latitude.HasValue && 
                           l.Longitude.HasValue &&
                           l.Partner != null &&
                           l.Partner.IsActive)
                .Include(l => l.Partner)
                .ToListAsync();

            // Фильтруем по радиусу (упрощенный расчет расстояния)
            var nearbyLocations = locations
                .Where(l => CalculateDistance(
                    (double)l.Latitude!.Value, (double)l.Longitude!.Value,
                    latitude, longitude) <= radius_km)
                .OrderBy(l => CalculateDistance(
                    (double)l.Latitude!.Value, (double)l.Longitude!.Value,
                    latitude, longitude))
                .Take(limit)
                .ToList();

            return Ok(new
            {
                items = nearbyLocations.Select(l => new
                {
                    partner_id = l.PartnerId,
                    partner_name = l.Partner?.Name,
                    address = l.Address,
                    latitude = l.Latitude,
                    longitude = l.Longitude,
                    distance_km = CalculateDistance(
                        (double)l.Latitude!.Value, (double)l.Longitude!.Value,
                        latitude, longitude)
                }),
                total = nearbyLocations.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения близлежащих партнеров");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить статистику пользователя
    /// GET /api/v1/unified/user-stats
    /// </summary>
    [HttpGet("user-stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetUserStats()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var wallet = await _walletService.GetWalletByUserIdAsync(userId.Value);
            var totalTransactions = await _context.Transactions
                .CountAsync(t => t.UserId == userId.Value);
            var totalOrders = await _context.Orders
                .CountAsync(o => o.UserId == userId.Value);

            return Ok(new
            {
                wallet_balance = wallet?.Balance ?? 0.0m,
                yescoin_balance = wallet?.YescoinBalance ?? 0.0m,
                total_transactions = totalTransactions,
                total_orders = totalOrders,
                total_earned = wallet?.TotalEarned ?? 0.0m,
                total_spent = wallet?.TotalSpent ?? 0.0m
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики пользователя");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить информацию о партнере
    /// GET /api/v1/unified/partner/{partner_id}
    /// </summary>
    [HttpGet("partner/{partner_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetPartnerInfo([FromRoute] int partner_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partner_id && p.IsActive);

            if (partner == null)
            {
                return NotFound(new { error = "Партнер не найден" });
            }

            var locations = await _context.PartnerLocations
                .Where(l => l.PartnerId == partner_id && l.IsActive)
                .ToListAsync();

            return Ok(new
            {
                id = partner.Id,
                name = partner.Name,
                description = partner.Description,
                category = partner.Category,
                logo_url = partner.LogoUrl,
                cover_image_url = partner.CoverImageUrl,
                cashback_rate = partner.CashbackRate,
                max_discount_percent = partner.MaxDiscountPercent,
                rating = 0.0, // Partner не имеет Rating
                locations = locations.Select(l => new
                {
                    id = l.Id,
                    address = l.Address,
                    latitude = l.Latitude,
                    longitude = l.Longitude,
                    phone_number = l.PhoneNumber
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения информации о партнере");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Радиус Земли в км
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
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
}

