using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис сторисов
/// Реализует логику из Python StoryService
/// </summary>
public class StoryService : IStoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StoryService> _logger;

    public StoryService(
        ApplicationDbContext context,
        ILogger<StoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<Story>> GetActiveStoriesAsync(int? userId, int? cityId, int? partnerId, int limit = 50)
    {
        try
        {
            var now = DateTime.UtcNow;
            
            var query = _context.Stories
                .Where(s => s.IsActive &&
                           (s.ExpiresAt == null || s.ExpiresAt >= now))
                .AsQueryable();

            // Фильтр по городу - через партнера (если нужно)
            // Story не имеет CityId напрямую

            // Фильтр по партнеру
            if (partnerId.HasValue)
            {
                query = query.Where(s => s.PartnerId == partnerId.Value);
            }

            var stories = await query
                .OrderByDescending(s => s.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return stories;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения активных сторисов");
            throw;
        }
    }

    public async Task<Story?> GetStoryByIdAsync(int storyId)
    {
        try
        {
            return await _context.Stories
                .FirstOrDefaultAsync(s => s.Id == storyId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения сториса по ID");
            throw;
        }
    }

    public async Task RecordStoryViewAsync(int storyId, int userId)
    {
        try
        {
            // Создаем запись просмотра в таблице StoryView
            var storyView = new StoryView
            {
                StoryId = storyId,
                UserId = userId,
                ViewedAt = DateTime.UtcNow
            };

            _context.StoryViews.Add(storyView);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка записи просмотра сториса");
            // Не пробрасываем исключение, чтобы не нарушить основной flow
        }
    }

    public async Task RecordStoryClickAsync(int storyId, int userId, string? actionType)
    {
        try
        {
            // Создаем запись клика в таблице StoryClick
            var storyClick = new StoryClick
            {
                StoryId = storyId,
                UserId = userId,
                ClickedAt = DateTime.UtcNow
            };

            _context.StoryClicks.Add(storyClick);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка записи клика по сторису");
            // Не пробрасываем исключение, чтобы не нарушить основной flow
        }
    }
}

