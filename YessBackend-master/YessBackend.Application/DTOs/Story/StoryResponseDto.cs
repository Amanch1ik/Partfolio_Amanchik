using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Story;

/// <summary>
/// DTO для ответа с информацией о сторисе
/// </summary>
public class StoryResponseDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("image_url")]
    public string ImageUrl { get; set; } = string.Empty;

    [JsonPropertyName("video_url")]
    public string? VideoUrl { get; set; }

    [JsonPropertyName("story_type")]
    public string StoryType { get; set; } = "announcement";

    [JsonPropertyName("partner_id")]
    public int? PartnerId { get; set; }

    [JsonPropertyName("partner_name")]
    public string? PartnerName { get; set; }

    [JsonPropertyName("promotion_id")]
    public int? PromotionId { get; set; }

    [JsonPropertyName("promotion_title")]
    public string? PromotionTitle { get; set; }

    [JsonPropertyName("city_id")]
    public int? CityId { get; set; }

    [JsonPropertyName("city_name")]
    public string? CityName { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("views_count")]
    public int ViewsCount { get; set; }

    [JsonPropertyName("clicks_count")]
    public int ClicksCount { get; set; }

    [JsonPropertyName("action_type")]
    public string? ActionType { get; set; }

    [JsonPropertyName("action_value")]
    public string? ActionValue { get; set; }

    [JsonPropertyName("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO для запроса отметки о просмотре
/// </summary>
public class StoryViewRequestDto
{
    [JsonPropertyName("story_id")]
    public int StoryId { get; set; }
}

/// <summary>
/// DTO для запроса отметки о клике
/// </summary>
public class StoryClickRequestDto
{
    [JsonPropertyName("story_id")]
    public int StoryId { get; set; }

    [JsonPropertyName("action_type")]
    public string? ActionType { get; set; }
}

