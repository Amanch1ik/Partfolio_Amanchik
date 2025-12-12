using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

public class Story
{
    [Key]
    public int Id { get; set; }
    public int? PartnerId { get; set; }
    [MaxLength(255)]
    public string? Title { get; set; }
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
    public string? Content { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StoryView
{
    [Key]
    public int Id { get; set; }
    public int StoryId { get; set; }
    public int UserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}

public class StoryClick
{
    [Key]
    public int Id { get; set; }
    public int StoryId { get; set; }
    public int UserId { get; set; }
    public DateTime ClickedAt { get; set; } = DateTime.UtcNow;
}
