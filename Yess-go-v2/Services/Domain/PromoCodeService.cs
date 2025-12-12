using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Services.Api;
using YessGoFront.ViewModels;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Реализация Domain сервиса для работы с промокодами
/// </summary>
public class PromoCodeService : IPromoCodeService
{
    private readonly IPromoCodeApiService _apiService;
    private readonly ILogger<PromoCodeService>? _logger;

    public PromoCodeService(
        IPromoCodeApiService apiService,
        ILogger<PromoCodeService>? logger = null)
    {
        _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
        _logger = logger;
    }

    public async Task<PromoCodeValidationResult> ValidatePromoCodeAsync(
        string code,
        decimal? orderAmount = null,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code cannot be empty", nameof(code));

            _logger?.LogDebug("Validating promo code: {Code}", code);
            
            var response = await _apiService.ValidatePromoCodeAsync(code, orderAmount, ct);
            
            return new PromoCodeValidationResult
            {
                IsValid = response.IsValid,
                DiscountAmount = response.DiscountAmount,
                FinalAmount = response.FinalAmount,
                Message = response.Message
            };
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error validating promo code");
            throw new NetworkException("Не удалось проверить промокод", ex);
        }
    }

    public async Task<List<PromoCodeHistoryItem>> GetUserPromoCodesAsync(
        CancellationToken ct = default)
    {
        try
        {
            _logger?.LogDebug("Getting user promo codes");
            
            var response = await _apiService.GetUserPromoCodesAsync(ct);
            
            return response
                .Where(item => !string.IsNullOrEmpty(item.Code))
                .Select(item => new PromoCodeHistoryItem
                {
                    Code = item.Code,
                    Description = item.Description ?? item.PromoCode?.Description ?? "Промокод применен",
                    Discount = item.DiscountAmount,
                    UsedAt = item.UsedAt
                })
                .OrderByDescending(x => x.UsedAt)
                .ToList();
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting user promo codes");
            throw new NetworkException("Не удалось загрузить историю промокодов", ex);
        }
    }
}

