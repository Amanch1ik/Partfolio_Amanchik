using System;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui.Controls;
using YessGoFront.Config;
using YessGoFront.Data;
using YessGoFront.Infrastructure.Auth;
using YessGoFront.Models;
using YessGoFront.Services;
using YessGoFront.Views.Controls;

namespace YessGoFront.Views
{
    public partial class ReferalPage : ContentPage
    {
        // Явные поля для элементов XAML (на случай проблем с генерацией кода)
        private Label? _referralCodeLabel;
        private Label? _referralLinkLabel;
        private Label? _totalReferredLabel;
        private Label? _activeReferredLabel;
        private Border? _progressBar;
        private Label? _progressLabel;

        public ReferalPage()
        {
            InitializeComponent();
            
            // Инициализируем ссылки на элементы после InitializeComponent
            _referralCodeLabel = this.FindByName<Label>("ReferralCodeLabel");
            _referralLinkLabel = this.FindByName<Label>("ReferralLinkLabel");
            _totalReferredLabel = this.FindByName<Label>("TotalReferredLabel");
            _activeReferredLabel = this.FindByName<Label>("ActiveReferredLabel");
            _progressBar = this.FindByName<Border>("ProgressBar");
            _progressLabel = this.FindByName<Label>("ProgressLabel");
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            // Обновляем нижний навбар
            if (this.FindByName<BottomNavBar>("BottomBar") is { } bottom)
                bottom.UpdateSelectedTab("More");

            // Загружаем реферальный код пользователя
            await LoadReferralCode();
        }

        private async Task LoadReferralCode()
        {
            try
            {
                string? referralCode = null;
                int totalReferred = 0;
                int activeReferred = 0;

                // Пытаемся получить пользователя и статистику через API
                var httpClientFactory = MauiProgram.Services?.GetService<IHttpClientFactory>();
                var authService = MauiProgram.Services?.GetService<IAuthenticationService>();

                if (httpClientFactory != null && authService != null)
                {
                    try
                    {
                        // HttpClient уже настроен с AuthHandler, который автоматически добавляет токен
                        var httpClient = httpClientFactory.CreateClient("ApiClient");
                        
                        // Проверяем, что пользователь аутентифицирован
                        var isAuthenticated = await authService.IsAuthenticatedAsync();
                        System.Diagnostics.Debug.WriteLine($"[ReferalPage] Пользователь аутентифицирован: {isAuthenticated}");

                        if (!isAuthenticated)
                        {
                            System.Diagnostics.Debug.WriteLine("[ReferalPage] Пользователь не аутентифицирован!");
                            if (_referralCodeLabel != null)
                                _referralCodeLabel.Text = "Войдите в систему";
                            if (_referralLinkLabel != null)
                                _referralLinkLabel.Text = "Войдите в систему";
                            return;
                        }

                        // Сначала пытаемся получить статистику (там тоже есть referral_code)
                        try
                        {
                            var statsEndpoint = ApiEndpoints.AuthEndpoints.ReferralStats;
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] Запрос статистики к: {httpClient.BaseAddress}{statsEndpoint}");
                            
                            var statsResponse = await httpClient.GetAsync(statsEndpoint);
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] Статистика HTTP Status: {statsResponse.StatusCode}");
                            
                            if (statsResponse.IsSuccessStatusCode)
                            {
                                var stats = await statsResponse.Content.ReadFromJsonAsync<ReferralStatsResponse>(
                                    new System.Text.Json.JsonSerializerOptions
                                    {
                                        PropertyNameCaseInsensitive = true
                                    });

                                if (stats != null)
                                {
                                    totalReferred = stats.TotalReferred;
                                    activeReferred = stats.ActiveReferred;
                                    referralCode = stats.ReferralCode;
                                    System.Diagnostics.Debug.WriteLine($"[ReferalPage] Статистика получена: Total={totalReferred}, Active={activeReferred}, Code={referralCode ?? "NULL"}");
                                }
                            }
                            else
                            {
                                var errorContent = await statsResponse.Content.ReadAsStringAsync();
                                System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка статистики HTTP {statsResponse.StatusCode}: {errorContent}");
                            }
                        }
                        catch (Exception statsEx)
                        {
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка загрузки статистики: {statsEx.Message}");
                        }

                        // Если referral_code не получили из статистики, пытаемся из /auth/me
                        if (string.IsNullOrWhiteSpace(referralCode))
                        {
                            var meEndpoint = ApiEndpoints.AuthEndpoints.Me;
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] Запрос к /auth/me: {httpClient.BaseAddress}{meEndpoint}");
                            
                            var response = await httpClient.GetAsync(meEndpoint);
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] /auth/me HTTP Status: {response.StatusCode}");
                            
                            if (response.IsSuccessStatusCode)
                            {
                                var user = await response.Content.ReadFromJsonAsync<UserDto>(
                                    new System.Text.Json.JsonSerializerOptions
                                    {
                                        PropertyNameCaseInsensitive = true
                                    });

                                System.Diagnostics.Debug.WriteLine($"[ReferalPage] Пользователь получен: ID={user?.Id}, ReferralCode={user?.ReferralCode ?? "NULL"}");
                                referralCode = user?.ReferralCode;
                                
                                // Обновляем локальную БД с актуальными данными
                                if (user != null && user.Id > 0)
                                {
                                    try
                                    {
                                        var dbContext = MauiProgram.Services?.GetService<AppDbContext>();
                                        if (dbContext != null)
                                        {
                                            var existingUser = await dbContext.Users.FindAsync(user.Id);
                                            if (existingUser != null)
                                            {
                                                existingUser.ReferralCode = user.ReferralCode;
                                                existingUser.Name = user.DisplayName;
                                                existingUser.Email = user.Email;
                                                existingUser.Phone = user.Phone;
                                                existingUser.CityId = user.CityId;
                                                existingUser.UpdatedAt = DateTime.UtcNow;
                                                await dbContext.SaveChangesAsync();
                                                System.Diagnostics.Debug.WriteLine("[ReferalPage] Локальная БД обновлена с актуальными данными");
                                            }
                                        }
                                    }
                                    catch (Exception dbEx)
                                    {
                                        System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка обновления локальной БД: {dbEx.Message}");
                                    }
                                }
                            }
                            else
                            {
                                var errorContent = await response.Content.ReadAsStringAsync();
                                System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка /auth/me HTTP {response.StatusCode}: {errorContent}");
                            }
                        }
                    }
                    catch (Exception apiEx)
                    {
                        System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка API запроса: {apiEx.Message}");
                        System.Diagnostics.Debug.WriteLine($"[ReferalPage] StackTrace: {apiEx.StackTrace}");
                        if (apiEx.InnerException != null)
                        {
                            System.Diagnostics.Debug.WriteLine($"[ReferalPage] InnerException: {apiEx.InnerException.Message}");
                        }
                    }
                }

                // Если не получили через API, пытаемся из локальной БД
                if (string.IsNullOrWhiteSpace(referralCode))
                {
                    System.Diagnostics.Debug.WriteLine("[ReferalPage] Пытаемся получить из локальной БД...");
                    var dbContext = MauiProgram.Services?.GetService<AppDbContext>();
                    if (dbContext != null)
                    {
                        var authService2 = MauiProgram.Services?.GetService<IAuthenticationService>();
                        if (authService2 != null)
                        {
                            var token = await authService2.GetAccessTokenAsync();
                            if (!string.IsNullOrWhiteSpace(token))
                            {
                                var userId = Infrastructure.Auth.JwtHelper.GetUserId(token);
                                System.Diagnostics.Debug.WriteLine($"[ReferalPage] UserId из токена: {userId}");
                                
                                if (userId.HasValue)
                                {
                                    var user = await dbContext.Users.FindAsync(userId.Value);
                                    System.Diagnostics.Debug.WriteLine($"[ReferalPage] Пользователь из БД: {(user != null ? $"ID={user.Id}, ReferralCode={user.ReferralCode ?? "NULL"}" : "не найден")}");
                                    
                                    referralCode = user?.ReferralCode;

                                    // Подсчитываем приглашенных из локальной БД
                                    totalReferred = await dbContext.Users.CountAsync(u => u.ReferredBy == userId.Value);
                                    System.Diagnostics.Debug.WriteLine($"[ReferalPage] Приглашенных из локальной БД: {totalReferred}");
                                }
                            }
                            else
                            {
                                System.Diagnostics.Debug.WriteLine("[ReferalPage] Токен не найден для локальной БД");
                            }
                        }
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine("[ReferalPage] AppDbContext не найден");
                    }
                }

                // Обновляем UI
                if (!string.IsNullOrWhiteSpace(referralCode))
                {
                    if (_referralCodeLabel != null)
                        _referralCodeLabel.Text = referralCode;
                    if (_referralLinkLabel != null)
                    {
                        // URL-кодируем реферальный код для безопасной передачи в ссылке
                        var encodedCode = Uri.EscapeDataString(referralCode);
                        _referralLinkLabel.Text = $"https://yessgo.app/register?ref={encodedCode}";
                    }
                    System.Diagnostics.Debug.WriteLine($"[ReferalPage] ✅ ReferralCode установлен: {referralCode}");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[ReferalPage] ⚠️ ReferralCode не найден ни в одном источнике");
                    if (_referralCodeLabel != null)
                        _referralCodeLabel.Text = "Не доступно";
                    if (_referralLinkLabel != null)
                        _referralLinkLabel.Text = "Не доступно";
                    
                    // Показываем более информативное сообщение
                    System.Diagnostics.Debug.WriteLine("[ReferalPage] Возможные причины:");
                    System.Diagnostics.Debug.WriteLine("  1. Пользователь не залогинен");
                    System.Diagnostics.Debug.WriteLine("  2. API недоступен");
                    System.Diagnostics.Debug.WriteLine("  3. У пользователя нет referral_code в БД");
                }

                // Обновляем статистику
                if (_totalReferredLabel != null)
                    _totalReferredLabel.Text = totalReferred.ToString();
                if (_activeReferredLabel != null)
                    _activeReferredLabel.Text = activeReferred.ToString();

                // Обновляем прогресс-бар (цель: 10 приглашенных)
                const int goal = 10;
                var progress = Math.Min((double)totalReferred / goal, 1.0);
                
                if (_progressBar != null)
                {
                    // Получаем ширину контейнера прогресс-бара
                    var progressContainer = _progressBar.Parent as VisualElement;
                    if (progressContainer != null && progressContainer.Width > 0)
                    {
                        var progressWidth = progress * progressContainer.Width;
                        _progressBar.WidthRequest = progressWidth;
                    }
                    else
                    {
                        // Fallback: используем фиксированную ширину
                        var progressWidth = progress * 300;
                        _progressBar.WidthRequest = progressWidth;
                    }
                }
                
                if (_progressLabel != null)
                    _progressLabel.Text = $"{totalReferred} / {goal}";
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ReferalPage] Ошибка загрузки реферального кода: {ex.Message}");
                if (_referralCodeLabel != null)
                    _referralCodeLabel.Text = "Ошибка загрузки";
                if (_referralLinkLabel != null)
                    _referralLinkLabel.Text = "Ошибка загрузки";
            }
        }

        private class ReferralStatsResponse
        {
            public int TotalReferred { get; set; }
            public int ActiveReferred { get; set; }
            public string? ReferralCode { get; set; }
        }

        public async void OnBackTapped(object sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("///more");
        }

        private async void OnCopyCodeClicked(object? sender, EventArgs e)
        {
            try
            {
                if (_referralCodeLabel == null) return;
                
                var code = _referralCodeLabel.Text;
                if (!string.IsNullOrWhiteSpace(code) && code != "Загрузка..." && code != "Не доступно" && code != "Ошибка загрузки")
                {
                    await Clipboard.SetTextAsync(code);
                    await DisplayAlert("Успешно", "Реферальный код скопирован в буфер обмена", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Ошибка", $"Не удалось скопировать код: {ex.Message}", "OK");
            }
        }

        private async void OnCopyLinkClicked(object? sender, EventArgs e)
        {
            try
            {
                if (_referralLinkLabel == null) return;
                
                var link = _referralLinkLabel.Text;
                if (!string.IsNullOrWhiteSpace(link) && link != "Загрузка..." && link != "Не доступно" && link != "Ошибка загрузки")
                {
                    await Clipboard.SetTextAsync(link);
                    await DisplayAlert("Успешно", "Реферальная ссылка скопирована в буфер обмена", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Ошибка", $"Не удалось скопировать ссылку: {ex.Message}", "OK");
            }
        }

        private async void OnShareClicked(object? sender, EventArgs e)
        {
            try
            {
                if (_referralLinkLabel == null) return;
                
                var link = _referralLinkLabel.Text;
                if (!string.IsNullOrWhiteSpace(link) && link != "Загрузка..." && link != "Не доступно" && link != "Ошибка загрузки")
                {
                    await Share.RequestAsync(new ShareTextRequest
                    {
                        Text = $"Присоединяйся к YessGo! Используй мою реферальную ссылку: {link}",
                        Title = "Реферальная ссылка YessGo"
                    });
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Ошибка", $"Не удалось поделиться: {ex.Message}", "OK");
            }
        }
    }
}
