using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui.Dispatching;
using YessGoFront.Data;
using YessGoFront.Infrastructure.Ui;
using YessGoFront.Services;
using YessGoFront.Services.Domain;

namespace YessGoFront;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

#if DEBUG
        // Тест здоровья API — можно оставить, не влияет на навигацию
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(2000);
                var clientFactory = MauiProgram.Services.GetRequiredService<IHttpClientFactory>();
                var client = clientFactory.CreateClient("ApiClient");

                var baseUrl = client.BaseAddress?.ToString() ?? "unknown";
                System.Diagnostics.Debug.WriteLine($"[App] 🔍 Testing API connection to: {baseUrl}");

                var response = await client.GetAsync("");
                var text = await response.Content.ReadAsStringAsync();

                System.Diagnostics.Debug.WriteLine(
                    $"[App] ✅ API Health Check: {response.StatusCode} - {text.Substring(0, Math.Min(100, text.Length))}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[App] ❌ API Health Check FAILED!");
                System.Diagnostics.Debug.WriteLine($"[App] Error: {ex.Message}");
            }
        });
#endif
    }

    /// <summary>
    /// Создаём окно с AppShell без дополнительной навигации.
    /// Вся логика переходов теперь в AppShell (Loaded + токен + PIN).
    /// </summary>
    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new AppShell());
    }

    protected override void OnResume()
    {
        base.OnResume();

        // Обновляем баланс при возврате приложения в фокус
        Task.Run(async () =>
        {
            try
            {
                var scopeFactory = MauiProgram.Services.GetService<IServiceScopeFactory>();
                if (scopeFactory != null)
                {
                    using var scope = scopeFactory.CreateScope();
                    var walletService = scope.ServiceProvider.GetService<IWalletService>();
                    if (walletService != null)
                    {
                        var balance = await walletService.GetBalanceAsync();
                        BalanceStore.Instance.Balance = balance;
                        System.Diagnostics.Debug.WriteLine($"[App] Balance refreshed on resume: {balance}");
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[App] Error refreshing balance on resume: {ex.Message}");
            }
        });
    }
}
