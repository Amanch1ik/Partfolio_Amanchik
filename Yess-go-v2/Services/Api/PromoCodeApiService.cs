using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Auth;
using YessGoFront.Infrastructure.Http;

namespace YessGoFront.Services.Api;

/// <summary>
/// Реализация API сервиса для работы с промокодами
/// </summary>
public class PromoCodeApiService : ApiClient, IPromoCodeApiService
{
    private readonly IAuthenticationService _authService;

    public PromoCodeApiService(
        HttpClient httpClient,
        IAuthenticationService authService,
        ILogger<PromoCodeApiService>? logger = null)
        : base(httpClient, logger)
    {
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
    }

    public async Task<PromoCodeValidationResponse> ValidatePromoCodeAsync(
        string code,
        decimal? orderAmount = null,
        CancellationToken ct = default)
    {
        // Получаем user_id из токена
        var token = await _authService.GetAccessTokenAsync();
        var userId = JwtHelper.GetUserId(token) ?? 0;

        var request = new
        {
            code = code,
            user_id = userId,
            order_amount = (double)(orderAmount ?? 0)
        };

        return await PostAsync<object, PromoCodeValidationResponse>(
            ApiEndpoints.PromoCodeEndpoints.Validate, request, ct);
    }

    public async Task<PromoCodeInfoResponse> GetPromoCodeInfoAsync(
        string code,
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.PromoCodeEndpoints.GetByCode(code);
        return await GetAsync<PromoCodeInfoResponse>(endpoint, ct);
    }

    public async Task<List<UserPromoCodeResponse>> GetUserPromoCodesAsync(
        CancellationToken ct = default)
    {
        var endpoint = ApiEndpoints.PromoCodeEndpoints.UserPromoCodes;
        var result = await GetAsync<List<UserPromoCodeResponse>>(endpoint, ct);
        return result ?? new List<UserPromoCodeResponse>();
    }
}

