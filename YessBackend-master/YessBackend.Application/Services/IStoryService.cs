using YessBackend.Application.DTOs.Story;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса сторисов
/// </summary>
public interface IStoryService
{
    Task<List<Story>> GetActiveStoriesAsync(int? userId, int? cityId, int? partnerId, int limit = 50);
    Task<Story?> GetStoryByIdAsync(int storyId);
    Task RecordStoryViewAsync(int storyId, int userId);
    Task RecordStoryClickAsync(int storyId, int userId, string? actionType);
}

