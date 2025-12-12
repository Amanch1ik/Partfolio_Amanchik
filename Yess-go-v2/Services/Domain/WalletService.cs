using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Models;
using YessGoFront.Services.Api;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Реализация Domain сервиса для работы с кошельком
/// Получает данные напрямую из API (PostgreSQL)
/// </summary>
public class WalletService : IWalletService
{
    private readonly IWalletApiService _apiService;
    private readonly IAuthService _authService;
    private readonly ILogger<WalletService>? _logger;

    public WalletService(
        IWalletApiService apiService,
        IAuthService authService,
        ILogger<WalletService>? logger = null)
    {
        _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger;
    }

    public async Task<decimal> GetBalanceAsync(CancellationToken ct = default)
    {
        try
        {
            // Если пользователь не аутентифицирован — не выполняем защищённый запрос
            if (!await _authService.IsAuthenticatedAsync())
            {
                _logger?.LogWarning("GetBalanceAsync called while user is not authenticated. Skipping API call.");
                return 0m;
            }

            _logger?.LogDebug("Getting wallet balance");
            return await _apiService.GetBalanceAsync(ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting balance");
            throw new NetworkException("Не удалось получить баланс", ex);
        }
    }

    public async Task<IReadOnlyList<PurchaseDto>> GetTransactionHistoryAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            // Получаем ID текущего пользователя
            var userId = await _authService.GetCurrentUserIdAsync();
            if (!userId.HasValue)
            {
                _logger?.LogWarning("GetTransactionHistoryAsync called while user is not authenticated. Skipping.");
                return Array.Empty<PurchaseDto>();
            }

            // Получаем транзакции напрямую из API (PostgreSQL)
            _logger?.LogDebug("Getting transactions from API, page: {Page}, pageSize: {PageSize}", 
                page, pageSize);
            return await _apiService.GetHistoryAsync(page, pageSize, ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting transaction history");
            throw new NetworkException("Не удалось загрузить историю транзакций", ex);
        }
    }

    public async Task<PurchaseDto> GetTransactionByIdAsync(
        string id,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException("Id cannot be empty", nameof(id));

            // Если пользователь не аутентифицирован — не выполняем защищённый запрос
            if (!await _authService.IsAuthenticatedAsync())
            {
                _logger?.LogWarning("GetTransactionByIdAsync called while user is not authenticated. Skipping API call.");
                // Возвращаем минимальный DTO без обращения к API
                return new PurchaseDto
                {
                    Id = id
                };
            }

            _logger?.LogDebug("Getting transaction by id: {Id}", id);
            return await _apiService.GetTransactionByIdAsync(id, ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting transaction {Id}", id);
            throw new NetworkException("Не удалось загрузить транзакцию", ex);
        }
    }
}

