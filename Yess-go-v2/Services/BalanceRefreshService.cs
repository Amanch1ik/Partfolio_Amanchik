using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using YessGoFront.Services.Domain;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Infrastructure.Ui;

namespace YessGoFront.Services;

/// <summary>
/// Сервис для периодического обновления баланса кошелька
/// </summary>
public class BalanceRefreshService : IDisposable
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<BalanceRefreshService>? _logger;
    private Timer? _timer;
    private bool _disposed = false;
    private readonly SemaphoreSlim _refreshLock = new SemaphoreSlim(1, 1);

    public BalanceRefreshService(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<BalanceRefreshService>? logger = null)
    {
        _serviceScopeFactory = serviceScopeFactory ?? throw new ArgumentNullException(nameof(serviceScopeFactory));
        _logger = logger;
    }

    /// <summary>
    /// Запускает периодическое обновление баланса
    /// </summary>
    /// <param name="interval">Интервал обновления</param>
    public void Start(TimeSpan interval)
    {
        if (_timer != null)
        {
            _logger?.LogWarning("Balance refresh service is already started");
            return;
        }

        _timer = new Timer(async _ => await RefreshBalanceAsync(), null, TimeSpan.Zero, interval);
        _logger?.LogInformation("Balance refresh service started with interval: {Interval}", interval);
    }

    /// <summary>
    /// Останавливает периодическое обновление баланса
    /// </summary>
    public void Stop()
    {
        _timer?.Dispose();
        _timer = null;
        _logger?.LogInformation("Balance refresh service stopped");
    }

    /// <summary>
    /// Обновляет баланс один раз (синхронно)
    /// </summary>
    public async Task RefreshBalanceAsync()
    {
        // Предотвращаем параллельные обновления
        if (!await _refreshLock.WaitAsync(0))
        {
            _logger?.LogDebug("Balance refresh already in progress, skipping");
            return;
        }

        try
        {
            // Создаем scope для получения Scoped сервисов
            using var scope = _serviceScopeFactory.CreateScope();

            // Не запускаем обновление, если пользователь не аутентифицирован
            var authService = scope.ServiceProvider.GetService<IAuthService>();
            if (authService != null)
            {
                var isAuthenticated = await authService.IsAuthenticatedAsync();
                if (!isAuthenticated)
                {
                    _logger?.LogDebug("User is not authenticated, skipping balance refresh");
                    return;
                }
            }

            var walletService = scope.ServiceProvider.GetService<IWalletService>();
            
            if (walletService != null)
            {
                try
                {
                    var balance = await walletService.GetBalanceAsync();
                    BalanceStore.Instance.Balance = balance;
                    _logger?.LogDebug("Balance refreshed: {Balance}", balance);
                }
                catch (UnauthorizedException ex)
                {
                    _logger?.LogWarning(ex, "Unauthorized while refreshing balance. Navigating to login page.");
                    // Переходим на страницу логина, не давая приложению упасть
                    await AppUiHelper.NavigateToLoginPageAsync();
                }
            }
            else
            {
                _logger?.LogWarning("IWalletService not found in service provider");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error refreshing balance");
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        Stop();
        _refreshLock?.Dispose();
        _disposed = true;
    }
}

