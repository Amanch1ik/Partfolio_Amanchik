using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер управления сторисами для админ-панели
/// Соответствует /api/v1/admin/stories из Python API
/// </summary>
[ApiController]
[Route("api/v1/admin/stories")]
[Tags("Admin Stories")]
[Authorize] // Требуется авторизация для админ-панели
public class AdminStoriesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IStoryService _storyService;
    private readonly ILogger<AdminStoriesController> _logger;

    public AdminStoriesController(
        ApplicationDbContext context,
        IStoryService storyService,
        ILogger<AdminStoriesController> logger)
    {
        _context = context;
        _storyService = storyService;
        _logger = logger;
    }

    /// <summary>
    /// Получить все сторисы (с фильтрацией)
    /// GET /api/v1/admin/stories
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetAllStories(
        [FromQuery] int? partner_id = null,
        [FromQuery] int? city_id = null,
        [FromQuery] bool? is_active = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var query = _context.Stories.AsQueryable();

            if (partner_id.HasValue)
            {
                query = query.Where(s => s.PartnerId == partner_id.Value);
            }

            if (city_id.HasValue)
            {
                // Можно добавить фильтрацию по городу через партнера
                query = query.Where(s => s.PartnerId != null);
            }

            if (is_active.HasValue)
            {
                query = query.Where(s => s.IsActive == is_active.Value);
            }

            var total = await query.CountAsync();
            var stories = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            return Ok(new
            {
                items = stories.Select(s => new
                {
                    id = s.Id,
                    partner_id = s.PartnerId,
                    title = s.Title,
                    image_url = s.ImageUrl,
                    content = s.Content,
                    expires_at = s.ExpiresAt,
                    is_active = s.IsActive,
                    created_at = s.CreatedAt
                }),
                total = total,
                limit = limit,
                offset = offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения сторисов");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить сторис по ID
    /// GET /api/v1/admin/stories/{story_id}
    /// </summary>
    [HttpGet("{story_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetStory([FromRoute] int story_id)
    {
        try
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == story_id);

            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            var viewsCount = await _context.StoryViews
                .CountAsync(sv => sv.StoryId == story_id);

            var clicksCount = await _context.StoryClicks
                .CountAsync(sc => sc.StoryId == story_id);

            return Ok(new
            {
                id = story.Id,
                partner_id = story.PartnerId,
                title = story.Title,
                image_url = story.ImageUrl,
                content = story.Content,
                expires_at = story.ExpiresAt,
                is_active = story.IsActive,
                created_at = story.CreatedAt,
                views_count = viewsCount,
                clicks_count = clicksCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Создать сторис
    /// POST /api/v1/admin/stories
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CreateStory([FromBody] CreateStoryRequest request)
    {
        try
        {
            var story = new Domain.Entities.Story
            {
                PartnerId = request.PartnerId,
                Title = request.Title,
                ImageUrl = request.ImageUrl,
                Content = request.Content,
                ExpiresAt = request.ExpiresAt,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Stories.Add(story);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStory), new { story_id = story.Id }, new
            {
                id = story.Id,
                partner_id = story.PartnerId,
                title = story.Title,
                image_url = story.ImageUrl,
                is_active = story.IsActive,
                created_at = story.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Обновить сторис
    /// PUT /api/v1/admin/stories/{story_id}
    /// </summary>
    [HttpPut("{story_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> UpdateStory([FromRoute] int story_id, [FromBody] UpdateStoryRequest request)
    {
        try
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == story_id);

            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            if (request.PartnerId.HasValue)
            {
                story.PartnerId = request.PartnerId.Value;
            }
            if (!string.IsNullOrEmpty(request.Title))
            {
                story.Title = request.Title;
            }
            if (request.ImageUrl != null)
            {
                story.ImageUrl = request.ImageUrl;
            }
            if (request.Content != null)
            {
                story.Content = request.Content;
            }
            if (request.ExpiresAt.HasValue)
            {
                story.ExpiresAt = request.ExpiresAt;
            }
            if (request.IsActive.HasValue)
            {
                story.IsActive = request.IsActive.Value;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = story.Id,
                partner_id = story.PartnerId,
                title = story.Title,
                is_active = story.IsActive,
                message = "Сторис обновлен"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Удалить сторис
    /// DELETE /api/v1/admin/stories/{story_id}
    /// </summary>
    [HttpDelete("{story_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteStory([FromRoute] int story_id)
    {
        try
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == story_id);

            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            _context.Stories.Remove(story);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Сторис удален" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Активировать/деактивировать сторис
    /// PATCH /api/v1/admin/stories/{story_id}/toggle
    /// </summary>
    [HttpPatch("{story_id}/toggle")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> ToggleStory([FromRoute] int story_id)
    {
        try
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == story_id);

            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            story.IsActive = !story.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = story.Id,
                is_active = story.IsActive,
                message = story.IsActive ? "Сторис активирован" : "Сторис деактивирован"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка переключения статуса сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить статистику сториса
    /// GET /api/v1/admin/stories/{story_id}/stats
    /// </summary>
    [HttpGet("{story_id}/stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetStoryStats([FromRoute] int story_id)
    {
        try
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == story_id);

            if (story == null)
            {
                return NotFound(new { error = "Сторис не найден" });
            }

            var viewsCount = await _context.StoryViews
                .CountAsync(sv => sv.StoryId == story_id);

            var clicksCount = await _context.StoryClicks
                .CountAsync(sc => sc.StoryId == story_id);

            var uniqueUsers = await _context.StoryViews
                .Where(sv => sv.StoryId == story_id)
                .Select(sv => sv.UserId)
                .Distinct()
                .CountAsync();

            return Ok(new
            {
                story_id = story_id,
                views_count = viewsCount,
                clicks_count = clicksCount,
                unique_users = uniqueUsers,
                ctr = viewsCount > 0 ? (double)clicksCount / viewsCount * 100 : 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики сториса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить общую статистику сторисов
    /// GET /api/v1/admin/stories/stats
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetStoriesStats()
    {
        try
        {
            var totalStories = await _context.Stories.CountAsync();
            var activeStories = await _context.Stories.CountAsync(s => s.IsActive);
            var totalViews = await _context.StoryViews.CountAsync();
            var totalClicks = await _context.StoryClicks.CountAsync();

            return Ok(new
            {
                total_stories = totalStories,
                active_stories = activeStories,
                total_views = totalViews,
                total_clicks = totalClicks,
                average_ctr = totalViews > 0 ? (double)totalClicks / totalViews * 100 : 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения общей статистики сторисов");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    public class CreateStoryRequest
    {
        public int? PartnerId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Content { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateStoryRequest
    {
        public int? PartnerId { get; set; }
        public string? Title { get; set; }
        public string? ImageUrl { get; set; }
        public string? Content { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool? IsActive { get; set; }
    }
}

