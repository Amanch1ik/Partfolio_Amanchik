using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер достижений и уровней
/// Соответствует /api/v1/achievements из Python API
/// </summary>
[ApiController]
[Route("api/v1/achievements")]
[Tags("Achievements")]
public class AchievementsController : ControllerBase
{
    private readonly IAchievementService _achievementService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AchievementsController> _logger;

    public AchievementsController(
        IAchievementService achievementService,
        ApplicationDbContext context,
        ILogger<AchievementsController> logger)
    {
        _achievementService = achievementService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Получить список достижений
    /// GET /api/v1/achievements
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetAchievements([FromQuery] int? user_id = null)
    {
        try
        {
            var achievements = await _achievementService.GetAchievementsAsync(user_id);
            return Ok(achievements);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить достижение по ID
    /// GET /api/v1/achievements/{achievement_id}
    /// </summary>
    [HttpGet("{achievement_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetAchievement([FromRoute] int achievement_id)
    {
        try
        {
            var achievement = await _achievementService.GetAchievementByIdAsync(achievement_id);
            if (achievement == null)
            {
                return NotFound(new { error = "Достижение не найдено" });
            }

            return Ok(achievement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижения");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить достижения пользователя
    /// GET /api/v1/achievements/user/{user_id}
    /// </summary>
    [HttpGet("user/{user_id}")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetUserAchievements([FromRoute] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var achievements = await _achievementService.GetUserAchievementsAsync(user_id);
            return Ok(achievements);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижений пользователя");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить уровень пользователя
    /// GET /api/v1/achievements/user/{user_id}/level
    /// </summary>
    [HttpGet("user/{user_id}/level")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetUserLevel([FromRoute] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var level = await _achievementService.GetUserLevelAsync(user_id);
            return Ok(level);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уровня пользователя");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить награды уровня
    /// GET /api/v1/achievements/rewards/level/{level}
    /// </summary>
    [HttpGet("rewards/level/{level}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetLevelRewards([FromRoute] int level)
    {
        try
        {
            var rewards = await _achievementService.GetLevelRewardsAsync(level);
            return Ok(rewards);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения наград уровня");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить награду уровня
    /// POST /api/v1/achievements/claim-reward/{reward_id}
    /// </summary>
    [HttpPost("claim-reward/{reward_id}")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> ClaimLevelReward([FromRoute] int reward_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var result = await _achievementService.ClaimLevelRewardAsync(userId.Value, reward_id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка получения награды");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения награды");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Статистика достижений
    /// GET /api/v1/achievements/stats
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetAchievementStats()
    {
        try
        {
            var stats = await _achievementService.GetAchievementStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики достижений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Проверить и разблокировать достижения
    /// POST /api/v1/achievements/check
    /// </summary>
    [HttpPost("check")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> CheckAndUnlockAchievements()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var result = await _achievementService.CheckAndUnlockAchievementsAsync(userId.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки достижений");
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
}

