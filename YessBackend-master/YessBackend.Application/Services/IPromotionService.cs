using System.Collections.Generic;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса акций и промо-кодов
/// </summary>
public interface IPromotionService
{
    Task<List<object>> GetActivePromotionsAsync(int? partnerId = null, int? cityId = null);
    Task<object?> GetPromotionByIdAsync(int promotionId);
    Task<List<object>> GetPromoCodesAsync(int? partnerId = null);
    Task<object?> GetPromoCodeByCodeAsync(string code);
    Task<object> ApplyPromoCodeAsync(int userId, string code, int? orderId = null);
    Task<List<object>> GetUserPromoCodesAsync(int userId);
    Task<object> CreatePromoCodeAsync(string code, int? partnerId = null, DateTime? validUntil = null);
    Task<object> ValidatePromoCodeAsync(string code, int userId);
    Task<object> GetPromotionStatsAsync();
    Task<object> CheckPromoCodeUsageAsync(int userId, string code);
}

