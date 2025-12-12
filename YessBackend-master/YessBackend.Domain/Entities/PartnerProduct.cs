using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Товары/услуги партнеров
/// Соответствует таблице partner_products в PostgreSQL
/// </summary>
public class PartnerProduct
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int PartnerId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? NameKg { get; set; }
    
    [MaxLength(200)]
    public string? NameRu { get; set; }
    
    public string? Description { get; set; }
    public string? DescriptionKg { get; set; }
    public string? DescriptionRu { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Price { get; set; }
    
    [MaxLength(50)]
    public string? Category { get; set; }
    
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
    
    // Дополнительные изображения в формате JSON (строка, хранящаяся в jsonb)
    [Column(TypeName = "jsonb")]
    public string? Images { get; set; }
    
    public bool IsAvailable { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; } = false;
    public int? StockQuantity { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? DiscountPrice { get; set; }
    
    [MaxLength(100)]
    public string? Sku { get; set; }
    
    [Column(TypeName = "decimal(8,2)")]
    public decimal? Weight { get; set; }
    
    [Column(TypeName = "decimal(8,2)")]
    public decimal? Volume { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal DiscountPercent { get; set; } = 0.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? OriginalPrice { get; set; }
    
    public int SortOrder { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("PartnerId")]
    public virtual Partner Partner { get; set; } = null!;
    
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

/// <summary>
/// Элементы заказа
/// Соответствует таблице order_items в PostgreSQL
/// </summary>
public class OrderItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int OrderId { get; set; }
    
    public int? ProductId { get; set; }
    
    // Информация о товаре на момент заказа (для истории)
    [MaxLength(200)]
    public string? ProductName { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal ProductPrice { get; set; }
    
    /// <summary>
    /// Цена за единицу (алиас для ProductPrice)
    /// </summary>
    [NotMapped]
    public decimal UnitPrice
    {
        get => ProductPrice;
        set => ProductPrice = value;
    }
    
    [Required]
    public int Quantity { get; set; } = 1;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; }
    
    /// <summary>
    /// Общая цена (алиас для Subtotal)
    /// </summary>
    [NotMapped]
    public decimal TotalPrice
    {
        get => Subtotal;
        set => Subtotal = value;
    }
    
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("OrderId")]
    public virtual Order Order { get; set; } = null!;
    
    [ForeignKey("ProductId")]
    public virtual PartnerProduct? Product { get; set; }
}
