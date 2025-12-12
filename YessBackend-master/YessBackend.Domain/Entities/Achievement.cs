using System.ComponentModel.DataAnnotations;

namespace YessBackend.Domain.Entities;

public class Achievement
{
    [Key]
    public int Id { get; set; }
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UserAchievement
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public int AchievementId { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}

public class UserLevel
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public int Level { get; set; } = 1;
    public decimal Experience { get; set; } = 0.0m;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class LevelReward
{
    [Key]
    public int Id { get; set; }
    public int Level { get; set; }
    public string? RewardType { get; set; }
    public decimal? RewardValue { get; set; }
}

public class UserLevelReward
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public int LevelRewardId { get; set; }
    public DateTime ClaimedAt { get; set; } = DateTime.UtcNow;
}

public class AchievementProgress
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public int AchievementId { get; set; }
    public decimal Progress { get; set; } = 0.0m;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
