using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YessBackend.Application.DTOs.Story;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;
using AutoMapper;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер сторисов
/// Соответствует /api/v1/stories из Python API
/// </summary>
[ApiController]
[Route("api/v1/stories")]
[Tags("Stories")]
public class StoriesController : ControllerBase
{
    private readonly IStoryService _storyService;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<StoriesController> _logger;

    public StoriesController(
        IStoryService storyService,
        ApplicationDbContext context,
        IMapper mapper,
        ILogger<StoriesController> logger)
    {
        _storyService = storyService;
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Получить активные сторисы
    /// GET /api/v1/stories
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<StoryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<StoryResponseDto>>> GetActiveStories(
        [FromQuery] int? city_id = null,
        [FromQuery] int? partner_id = null,
        [FromQuery] int limit = 50)
    {
        try
        {
            var userId = GetCurrentUserId();

            // Получаем город пользователя, если не указан
            if (!city_id.HasValue && userId.HasValue)
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId.Value);
                if (user != null && user.CityId.HasValue)
                {
                    city_id = user.CityId.Value;
                }
            }

            var stories = await _storyService.GetActiveStoriesAsync(userId, city_id, partner_id, limit);

            // Преобразуем в DTO с дополнительной информацией
            var result = new List<StoryResponseDto>();
            foreach (var story in stories)
            {
                // Подсчитываем количество просмотров и кликов
                var viewsCount = await _context.StoryViews
                    .CountAsync(sv => sv.StoryId == story.Id);
                var clicksCount = await _context.StoryClicks
                    .CountAsync(sc => sc.StoryId == story.Id);

                var storyDto = new StoryResponseDto
                {
                    Id = story.Id,
                    Title = story.Title ?? string.Empty,
                    Description = story.Content,
                    ImageUrl = story.ImageUrl ?? string.Empty,
                    VideoUrl = null,
                    StoryType = "announcement",
                    PartnerId = story.PartnerId,
                    PromotionId = null,
                    CityId = null,
                    Status = story.IsActive ? "active" : "inactive",
                    IsActive = story.IsActive,
                    ViewsCount = viewsCount,
                    ClicksCount = clicksCount,
                    ActionType = null,
                    ActionValue = null,
                    ExpiresAt = story.ExpiresAt ?? DateTime.UtcNow.AddDays(1),
                    CreatedAt = story.CreatedAt
                };

                // Добавляем информацию о партнере
                if (story.PartnerId.HasValue)
                {
                    var partner = await _context.Partners
                        .FirstOrDefaultAsync(p => p.Id == story.PartnerId.Value);
                    if (partner != null)
                    {
                        storyDto.PartnerName = partner.Name;
                    }
                }

                // Story не имеет PromotionId и CityId напрямую
                // Можно получить через партнера, если нужно

                result.Add(storyDto);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения активных сторисов");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить сторис по ID
    /// GET /api/v1/stories/{story_id}
    /// </summary>
    [HttpGet("{story_id}")]
    [ProducesResponseType(typeof(StoryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<StoryResponseDto>> GetStory([FromRoute] int story_id)
    {
        try
        {
            var story = await _storyService.GetStoryByIdAsync(story_id);
            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            // Подсчитываем количество просмотров и кликов
            var viewsCount = await _context.StoryViews
                .CountAsync(sv => sv.StoryId == story.Id);
            var clicksCount = await _context.StoryClicks
                .CountAsync(sc => sc.StoryId == story.Id);

            var storyDto = new StoryResponseDto
            {
                Id = story.Id,
                Title = story.Title ?? string.Empty,
                Description = story.Content,
                ImageUrl = story.ImageUrl ?? string.Empty,
                VideoUrl = null,
                StoryType = "announcement",
                PartnerId = story.PartnerId,
                PromotionId = null,
                CityId = null,
                Status = story.IsActive ? "active" : "inactive",
                IsActive = story.IsActive,
                ViewsCount = viewsCount,
                ClicksCount = clicksCount,
                ActionType = null,
                ActionValue = null,
                ExpiresAt = story.ExpiresAt ?? DateTime.UtcNow.AddDays(1),
                CreatedAt = story.CreatedAt
            };

            // Добавляем информацию о партнере
            if (story.PartnerId.HasValue)
            {
                var partner = await _context.Partners
                    .FirstOrDefaultAsync(p => p.Id == story.PartnerId.Value);
                if (partner != null)
                {
                    storyDto.PartnerName = partner.Name;
                }
            }

            // Story не имеет PromotionId и CityId напрямую
            // Можно получить через партнера, если нужно

            return Ok(storyDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Зафиксировать просмотр сториса
    /// POST /api/v1/stories/{story_id}/view
    /// </summary>
    [HttpPost("{story_id}/view")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> RecordStoryView([FromRoute] int story_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            await _storyService.RecordStoryViewAsync(story_id, userId.Value);

            return Ok(new { success = true, message = "Просмотр зафиксирован" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка записи просмотра сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Зафиксировать клик по сторису
    /// POST /api/v1/stories/{story_id}/click
    /// </summary>
    [HttpPost("{story_id}/click")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> RecordStoryClick(
        [FromRoute] int story_id,
        [FromBody] StoryClickRequestDto? request = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var story = await _storyService.GetStoryByIdAsync(story_id);
            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            await _storyService.RecordStoryClickAsync(story_id, userId.Value, request?.ActionType);

            return Ok(new
            {
                success = true,
                action_type = (string?)null,
                action_value = (string?)null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка записи клика по сторису");
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

