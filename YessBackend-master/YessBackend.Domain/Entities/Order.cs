using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Статусы заказа
/// </summary>
public enum OrderStatus
{
    Pending,    // Заказ создан, ожидает оплаты
    Paid,       // Оплачен
    Processing, // Обрабатывается партнером
    Ready,      // Готов к выдаче/доставке
    Completed,  // Завершен
    Cancelled,  // Отменен
    Refunded    // Возврат средств
}

/// <summary>
/// Заказы
/// Соответствует таблице orders в PostgreSQL
/// </summary>
public class Order
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public int PartnerId { get; set; }
    
    public int? LocationId { get; set; }
    
    // Суммы
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal OrderTotal { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal OriginalAmount { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Discount { get; set; } = 0.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal DiscountAmount { get; set; } = 0.0m;
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal CashbackAmount { get; set; } = 0.0m;
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal YescoinUsed { get; set; } = 0.0m;
    
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal FinalAmount { get; set; }
    
    public string? Notes { get; set; }
    
    // Статус заказа
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    
    // Информация о доставке/получении
    [MaxLength(500)]
    public string? DeliveryAddress { get; set; }
    
    [MaxLength(50)]
    public string DeliveryType { get; set; } = "pickup"; // "pickup", "delivery"
    
    public string? DeliveryNotes { get; set; }
    
    // Платежная информация
    public int? TransactionId { get; set; }
    
    [MaxLength(50)]
    public string? PaymentMethod { get; set; }
    
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "pending";
    
    // Идемпотентность
    [Required]
    [MaxLength(255)]
    public string IdempotencyKey { get; set; } = string.Empty;
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    [ForeignKey("PartnerId")]
    public virtual Partner Partner { get; set; } = null!;
    
    public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    
    [ForeignKey("TransactionId")]
    public virtual Transaction? Transaction { get; set; }
}
