using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using YessGoFront.Services.Domain;
using YessGoFront.Views;
using YessGoFront.Pages;
using YessGoFront.Services;

namespace YessGoFront
{
    public partial class AppShell : Shell
    {
        private bool _initialized;

        public AppShell()
        {
            InitializeComponent();

            // Регистрация внутренних маршрутов
            Routing.RegisterRoute(nameof(Views.WalletPage), typeof(Views.WalletPage));
            Routing.RegisterRoute(nameof(Views.PartnersListPage), typeof(Views.PartnersListPage));
            Routing.RegisterRoute(nameof(Views.PartnerPage), typeof(Views.PartnerPage));
            Routing.RegisterRoute("partnerdetails", typeof(Views.PartnerDetailPage));
            Routing.RegisterRoute("PartnerDetailViewPage", typeof(PartnerDetailViewPage));
            Routing.RegisterRoute(nameof(Views.TransactionsPage), typeof(Views.TransactionsPage));
            Routing.RegisterRoute(nameof(Views.TransactionDetailsPage), typeof(Views.TransactionDetailsPage));
            Routing.RegisterRoute(nameof(Views.PolicyPage), typeof(Views.PolicyPage));
            Routing.RegisterRoute(nameof(Views.ConditionsPage), typeof(Views.ConditionsPage));
            Routing.RegisterRoute(nameof(Views.ContactsPage), typeof(Views.ContactsPage));
            Routing.RegisterRoute(nameof(Views.PublicOfferPage), typeof(Views.PublicOfferPage));
            Routing.RegisterRoute(nameof(Views.RefundPolicyPage), typeof(Views.RefundPolicyPage));
            Routing.RegisterRoute(nameof(Views.PaymentSecurityPage), typeof(Views.PaymentSecurityPage));
            Routing.RegisterRoute(nameof(Views.DeliveryTermsPage), typeof(Views.DeliveryTermsPage));
            Routing.RegisterRoute(nameof(Views.FeedbackPage), typeof(Views.FeedbackPage));
            Routing.RegisterRoute(nameof(Views.CertificatePage), typeof(Views.CertificatePage));


        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            if (_initialized)
                return;

            _initialized = true;

            Debug.WriteLine("[AppShell] OnAppearing: starting startup auth/PIN check");

            try
            {
                var authService = MauiProgram.Services.GetService<IAuthService>();

                if (authService == null)
                {
                    Debug.WriteLine("[AppShell] OnAppearing: IAuthService is null → navigating to login");
                    await Shell.Current.GoToAsync("///login", animate: false);
                    return;
                }

                // Получаем сервис аутентификации один раз для использования во всех блоках
                var authenticationService = MauiProgram.Services.GetService<YessGoFront.Infrastructure.Auth.IAuthenticationService>();

                // 1. Проверяем, есть ли пользователь в локальной SQLite БД
                var localUser = await authService.GetLocalUserAsync();
                Debug.WriteLine($"[AppShell] OnAppearing: LocalUser exists={localUser != null} (UserId={localUser?.Id ?? 0})");

                if (localUser != null)
                {
                    // Проверяем состояние токенов для оптимизации UX
                    bool tokensAreFresh = false;
                    if (authenticationService != null)
                    {
                        var accessToken = await authenticationService.GetAccessTokenAsync();
                        if (!string.IsNullOrWhiteSpace(accessToken))
                        {
                            var isTokenValid = Infrastructure.Auth.JwtHelper.IsTokenValid(accessToken);
                            var remainingMinutes = Infrastructure.Auth.JwtHelper.GetTokenRemainingMinutes(accessToken);

                            if (isTokenValid && remainingMinutes > 15)
                            {
                                // Токены свежие (более 15 минут) - можем оптимизировать UX
                                tokensAreFresh = true;
                                Debug.WriteLine($"[AppShell] Tokens are fresh: {remainingMinutes} minutes remaining");
                            }
                            else if (!isTokenValid)
                            {
                                // Токены истекли - пытаемся обновить в фоне
                                var refreshToken = await authenticationService.GetRefreshTokenAsync();
                                if (!string.IsNullOrWhiteSpace(refreshToken))
                                {
                                    Debug.WriteLine("[AppShell] Access token expired, attempting to refresh in background");
                                    // Обновляем в фоне, не ждем результата
                                    _ = Task.Run(async () =>
                                    {
                                        try
                                        {
                                            await authenticationService.RefreshTokenAsync();
                                        }
                                        catch (Exception ex)
                                        {
                                            Debug.WriteLine($"[AppShell] Background token refresh failed: {ex.Message}");
                                        }
                                    });
                                }
                            }
                        }
                    }

                    // Проверяем наличие PIN
                    var hasValidPin = await authService.HasPinAsync();
                    Debug.WriteLine($"[AppShell] OnAppearing: hasValidPin={hasValidPin}, tokensAreFresh={tokensAreFresh}");

                    if (!hasValidPin)
                    {
                        Debug.WriteLine("[AppShell] Decision: local user but NO valid PIN → navigating to PIN creation");
                        await Shell.Current.GoToAsync("///pinlogin?isCreatingPin=true", animate: false);
                    }
                    else
                    {
                        // Отправляем на PIN экран с информацией о состоянии токенов
                        var route = tokensAreFresh ? "///pinlogin?tokenStatus=fresh" : "///pinlogin";
                        Debug.WriteLine($"[AppShell] Decision: local user WITH valid PIN → navigating to PIN login (tokenStatus: {(tokensAreFresh ? "fresh" : "normal")})");
                        await Shell.Current.GoToAsync(route, animate: false);
                    }
                    return;
                }

                // 2. Пользователя нет в локальной БД - проверяем, есть ли токены (пользователь есть на сервере)
                var hasRefreshToken = false;
                if (authenticationService != null)
                {
                    var refreshToken = await authenticationService.GetRefreshTokenAsync();
                    hasRefreshToken = !string.IsNullOrWhiteSpace(refreshToken);
                    Debug.WriteLine($"[AppShell] OnAppearing: HasRefreshToken={hasRefreshToken}");
                }

                if (hasRefreshToken)
                {
                    // Есть токены на сервере, но нет локального пользователя - выполняем автоматический вход
                    Debug.WriteLine("[AppShell] Decision: no local user but has refresh token → attempting auto-login");
                    var autoLoginSuccess = await authService.AutoLoginIfNoLocalUserAsync();
                    
                    if (autoLoginSuccess)
                    {
                        Debug.WriteLine("[AppShell] Auto-login successful, checking PIN");
                        var hasValidPin = await authService.HasPinAsync();
                        
                        if (!hasValidPin)
                        {
                            Debug.WriteLine("[AppShell] Decision: auto-login successful but NO valid PIN → navigating to PIN creation");
                            await Shell.Current.GoToAsync("///pinlogin?isCreatingPin=true", animate: false);
                        }
                        else
                        {
                            Debug.WriteLine("[AppShell] Decision: auto-login successful WITH valid PIN → navigating to PIN login");
                            await Shell.Current.GoToAsync("///pinlogin", animate: false);
                        }
                    }
                    else
                    {
                        Debug.WriteLine("[AppShell] Auto-login failed → navigating to login");
                        // Очищаем токены, если автоматический вход не удался
                        if (authenticationService != null)
                        {
                            await authenticationService.ClearTokensAsync();
                        }
                        await Shell.Current.GoToAsync("///login", animate: false);
                    }
                    return;
                }

                // 3. Нет ни локального пользователя, ни токенов - показываем экран логина
                Debug.WriteLine("[AppShell] Decision: no local user and no tokens → navigating to login");
                await Shell.Current.GoToAsync("///login", animate: false);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[AppShell] OnAppearing: error during startup routing: {ex.Message}");
                Debug.WriteLine($"[AppShell] StackTrace: {ex.StackTrace}");

                // Fallback: отправляем на экран логина
                try
                {
                    await Shell.Current.GoToAsync("///login", animate: false);
                }
                catch
                {
                    // Игнорируем вторичную ошибку навигации
                }
            }
        }
    }
}
