using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис достижений и уровней
/// Реализует логику из Python AchievementService
/// </summary>
public class AchievementService : IAchievementService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AchievementService> _logger;

    public AchievementService(
        ApplicationDbContext context,
        ILogger<AchievementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<object>> GetAchievementsAsync(int? userId = null)
    {
        try
        {
            var achievements = await _context.Achievements
                .ToListAsync();

            var result = achievements.Select(a => new
            {
                id = a.Id,
                name = a.Name,
                description = a.Description,
                created_at = a.CreatedAt
            }).Cast<object>().ToList();

            if (userId.HasValue)
            {
                var userAchievements = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId.Value)
                    .ToListAsync();

                foreach (var achievement in result)
                {
                    // Помечаем достижения, которые есть у пользователя
                    // Упрощенная версия
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижений");
            throw;
        }
    }

    public async Task<object?> GetAchievementByIdAsync(int achievementId)
    {
        try
        {
            var achievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Id == achievementId);

            if (achievement == null)
            {
                return null;
            }

            return new
            {
                id = achievement.Id,
                name = achievement.Name,
                description = achievement.Description,
                created_at = achievement.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижения по ID");
            throw;
        }
    }

    public async Task<List<object>> GetUserAchievementsAsync(int userId)
    {
        try
        {
            var userAchievements = await _context.UserAchievements
                .Where(ua => ua.UserId == userId)
                .ToListAsync();

            var achievementIds = userAchievements.Select(ua => ua.AchievementId).ToList();
            var achievements = await _context.Achievements
                .Where(a => achievementIds.Contains(a.Id))
                .ToListAsync();

            return userAchievements.Select(ua =>
            {
                var achievement = achievements.FirstOrDefault(a => a.Id == ua.AchievementId);
                return new
                {
                    id = ua.Id,
                    achievement_id = ua.AchievementId,
                    achievement_name = achievement?.Name ?? "",
                    achievement_description = achievement?.Description,
                    unlocked_at = ua.UnlockedAt
                } as object;
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения достижений пользователя");
            throw;
        }
    }

    public async Task<object> GetUserLevelAsync(int userId)
    {
        try
        {
            var userLevel = await _context.UserLevels
                .FirstOrDefaultAsync(ul => ul.UserId == userId);

            if (userLevel == null)
            {
                // Создаем начальный уровень, если его нет
                userLevel = new UserLevel
                {
                    UserId = userId,
                    Level = 1,
                    Experience = 0.0m,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserLevels.Add(userLevel);
                await _context.SaveChangesAsync();
            }

            // Подсчитываем очки на основе транзакций
            var totalEarned = await _context.Transactions
                .Where(t => t.UserId == userId && t.Status == "completed")
                .SumAsync(t => t.Amount);

            var levelInfo = CalculateUserLevel((int)totalEarned);

            return new
            {
                user_id = userId,
                current_level = levelInfo.current_level,
                current_points = (int)userLevel.Experience,
                total_points_earned = (int)totalEarned,
                level_name = levelInfo.level_name,
                points_to_next_level = levelInfo.points_to_next_level,
                progress_percent = levelInfo.progress_percent
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уровня пользователя");
            throw;
        }
    }

    public async Task<List<object>> GetLevelRewardsAsync(int level)
    {
        try
        {
            var rewards = await _context.LevelRewards
                .Where(lr => lr.Level == level)
                .ToListAsync();

            return rewards.Select(r => new
            {
                id = r.Id,
                level = r.Level,
                reward_type = r.RewardType,
                reward_value = r.RewardValue
            } as object).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения наград уровня");
            throw;
        }
    }

    public async Task<object> ClaimLevelRewardAsync(int userId, int rewardId)
    {
        try
        {
            var reward = await _context.LevelRewards
                .FirstOrDefaultAsync(r => r.Id == rewardId);

            if (reward == null)
            {
                throw new InvalidOperationException("Reward not found");
            }

            var userLevel = await GetUserLevelAsync(userId);
            var levelDict = userLevel as Dictionary<string, object>;
            var currentLevel = Convert.ToInt32(levelDict?["current_level"] ?? 1);

            if (currentLevel < reward.Level)
            {
                throw new InvalidOperationException($"User level {currentLevel} is not enough for reward level {reward.Level}");
            }

            // Создаем запись о получении награды
            var userLevelReward = new UserLevelReward
            {
                UserId = userId,
                LevelRewardId = rewardId,
                ClaimedAt = DateTime.UtcNow
            };

            _context.UserLevelRewards.Add(userLevelReward);
            await _context.SaveChangesAsync();

            // TODO: Выдача награды (пополнение кошелька и т.д.)

            return new { message = $"Reward claimed successfully" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения награды");
            throw;
        }
    }

    public async Task<object> GetAchievementStatsAsync()
    {
        try
        {
            var totalAchievements = await _context.Achievements.CountAsync();
            var totalUserAchievements = await _context.UserAchievements.CountAsync();
            var totalUserLevels = await _context.UserLevels.CountAsync();

            return new
            {
                total_achievements = totalAchievements,
                total_user_achievements = totalUserAchievements,
                total_user_levels = totalUserLevels
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики достижений");
            throw;
        }
    }

    public async Task<object> CheckAndUnlockAchievementsAsync(int userId)
    {
        try
        {
            // Проверка и разблокировка достижений
            // Упрощенная версия - проверяем базовые достижения

            var achievements = await _context.Achievements.ToListAsync();
            var userAchievements = await _context.UserAchievements
                .Where(ua => ua.UserId == userId)
                .Select(ua => ua.AchievementId)
                .ToListAsync();

            var unlockedCount = 0;

            foreach (var achievement in achievements)
            {
                if (!userAchievements.Contains(achievement.Id))
                {
                    // Проверяем условия достижения (упрощенная версия)
                    // В реальности здесь должна быть сложная логика
                    var shouldUnlock = false;

                    if (shouldUnlock)
                    {
                        var userAchievement = new UserAchievement
                        {
                            UserId = userId,
                            AchievementId = achievement.Id,
                            UnlockedAt = DateTime.UtcNow
                        };
                        _context.UserAchievements.Add(userAchievement);
                        unlockedCount++;
                    }
                }
            }

            if (unlockedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            return new
            {
                unlocked_count = unlockedCount,
                message = unlockedCount > 0 ? $"{unlockedCount} achievements unlocked" : "No new achievements"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки достижений");
            throw;
        }
    }

    private (int current_level, string level_name, int points_to_next_level, int progress_percent) CalculateUserLevel(int totalPoints)
    {
        int level;
        string levelName;
        int pointsToNext;
        int progressPercent;

        if (totalPoints < 100)
        {
            level = 1;
            levelName = "Новичок";
            pointsToNext = 100 - totalPoints;
            progressPercent = (int)((totalPoints / 100.0) * 100);
        }
        else if (totalPoints < 500)
        {
            level = 2;
            levelName = "Покупатель";
            pointsToNext = 500 - totalPoints;
            progressPercent = (int)(((totalPoints - 100) / 400.0) * 100);
        }
        else if (totalPoints < 1000)
        {
            level = 3;
            levelName = "Постоянный клиент";
            pointsToNext = 1000 - totalPoints;
            progressPercent = (int)(((totalPoints - 500) / 500.0) * 100);
        }
        else if (totalPoints < 2500)
        {
            level = 4;
            levelName = "VIP клиент";
            pointsToNext = 2500 - totalPoints;
            progressPercent = (int)(((totalPoints - 1000) / 1500.0) * 100);
        }
        else if (totalPoints < 5000)
        {
            level = 5;
            levelName = "Золотой клиент";
            pointsToNext = 5000 - totalPoints;
            progressPercent = (int)(((totalPoints - 2500) / 2500.0) * 100);
        }
        else
        {
            level = 6;
            levelName = "Платиновый клиент";
            pointsToNext = 0;
            progressPercent = 100;
        }

        return (level, levelName, pointsToNext, progressPercent);
    }
}

