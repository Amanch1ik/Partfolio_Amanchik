namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса достижений и уровней
/// </summary>
public interface IAchievementService
{
    Task<List<object>> GetAchievementsAsync(int? userId = null);
    Task<object?> GetAchievementByIdAsync(int achievementId);
    Task<List<object>> GetUserAchievementsAsync(int userId);
    Task<object> GetUserLevelAsync(int userId);
    Task<List<object>> GetLevelRewardsAsync(int level);
    Task<object> ClaimLevelRewardAsync(int userId, int rewardId);
    Task<object> GetAchievementStatsAsync();
    Task<object> CheckAndUnlockAchievementsAsync(int userId);
}

