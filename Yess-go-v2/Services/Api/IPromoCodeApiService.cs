namespace YessGoFront.Services.Api;

/// <summary>
/// API сервис для работы с промокодами
/// </summary>
public interface IPromoCodeApiService
{
    /// <summary>
    /// Валидация промокода
    /// </summary>
    Task<PromoCodeValidationResponse> ValidatePromoCodeAsync(
        string code,
        decimal? orderAmount = null,
        CancellationToken ct = default);

    /// <summary>
    /// Получение информации о промокоде
    /// </summary>
    Task<PromoCodeInfoResponse> GetPromoCodeInfoAsync(
        string code,
        CancellationToken ct = default);

    /// <summary>
    /// Получение промокодов пользователя
    /// </summary>
    Task<List<UserPromoCodeResponse>> GetUserPromoCodesAsync(
        CancellationToken ct = default);
}

/// <summary>
/// Ответ на валидацию промокода
/// </summary>
public class PromoCodeValidationResponse
{
    public bool IsValid { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string? Message { get; set; }
    public PromoCodeInfo? PromoCode { get; set; }
}

/// <summary>
/// Информация о промокоде
/// </summary>
public class PromoCodeInfo
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Ответ с информацией о промокоде
/// </summary>
public class PromoCodeInfoResponse
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Промокод пользователя
/// </summary>
public class UserPromoCodeResponse
{
    public int Id { get; set; }
    public PromoCodeInfo? PromoCode { get; set; }
    public decimal DiscountAmount { get; set; }
    public DateTime UsedAt { get; set; }
    public int? OrderId { get; set; }
    
    // Helper properties для удобства
    public string Code => PromoCode?.Code ?? string.Empty;
    public string? Description => PromoCode?.Description;
}

