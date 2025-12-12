using YessGoFront.ViewModels;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Domain сервис для работы с промокодами
/// </summary>
public interface IPromoCodeService
{
    /// <summary>
    /// Валидация промокода
    /// </summary>
    Task<PromoCodeValidationResult> ValidatePromoCodeAsync(
        string code,
        decimal? orderAmount = null,
        CancellationToken ct = default);

    /// <summary>
    /// Получение промокодов пользователя
    /// </summary>
    Task<List<PromoCodeHistoryItem>> GetUserPromoCodesAsync(
        CancellationToken ct = default);
}

/// <summary>
/// Результат валидации промокода
/// </summary>
public class PromoCodeValidationResult
{
    public bool IsValid { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string? Message { get; set; }
}

