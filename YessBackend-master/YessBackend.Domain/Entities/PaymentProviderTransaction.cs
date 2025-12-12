using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YessBackend.Domain.Entities;

/// <summary>
/// Транзакции от платежных провайдеров (Optima Bank)
/// Соответствует таблице payment_provider_transactions в PostgreSQL
/// </summary>
public class PaymentProviderTransaction
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Qid { get; set; } = string.Empty; // QID от банка (уникальный)
    
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = "optima_bank";
    
    // Тип операции
    [Required]
    [MaxLength(10)]
    public string OperationType { get; set; } = string.Empty; // QE10 (check), QE11 (pay)
    
    // Данные запроса от банка
    [MaxLength(100)]
    public string? Account { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? Amount { get; set; }
    
    [MaxLength(14)]
    public string? TxnDate { get; set; }
    
    // Ответ системы
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
    
    [MaxLength(10)]
    public string? ErrorCode { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    // Данные для ответа (для QE10)
    [MaxLength(20)]
    public string? AccountStatus { get; set; }
    
    [MaxLength(255)]
    public string? AccountName { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? AccountBalance { get; set; }
    
    // Данные для ответа (для QE11)
    [MaxLength(20)]
    public string? PaymentStatus { get; set; }
    
    [MaxLength(100)]
    public string? PaymentId { get; set; }
    
    // Связь с внутренней транзакцией
    public int? InternalTransactionId { get; set; }
    
    // Метаданные
    public string? RawRequest { get; set; }
    public string? RawResponse { get; set; }
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(255)]
    public string? UserAgent { get; set; }
    
    // Флаги
    public bool IsDuplicate { get; set; } = false;
    public bool IsProcessed { get; set; } = false;
    
    // Временные метки
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
