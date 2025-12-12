using System;
using System.ComponentModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Dispatching;
using Microsoft.Maui.ApplicationModel;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;
using YessGoFront.ViewModels;
using YessGoFront.Views.Controls;

namespace YessGoFront.Views
{
    public partial class MainPage : ContentPage
    {
        // ============================
        // Навигация
        // ============================
        private bool _isNavigating;
        private const string WalletRoute = "///wallet";

        // ============================
        // Story Crossfade
        // ============================
        private bool _topIsA = true;
        private CancellationTokenSource? _swapCts;
        private Image? _imgA;
        private Image? _imgB;

        // ============================
        // Автоскролл партнёров
        // ============================
        private CancellationTokenSource? _autoScrollCts;
        private DateTime _lastTouch = DateTime.Now;
        private const int IdleSeconds = 5;

        // Скорости рядов
        private const double SpeedRow1 = 20;   // вправо
        private const double SpeedRow2 = -20;  // влево
        private const double SpeedRow3 = 20;   // вправо

        private ScrollView? _row1;
        private ScrollView? _row2;
        private ScrollView? _row3;

        private bool _row1Ready;
        private bool _row2Ready;
        private bool _row3Ready;


        // ============================
        // Конструктор
        // ============================
        public MainPage()
        {
            InitializeComponent();

            // DI
            var bannerApiService = MauiProgram.Services.GetService<IBannerApiService>();
            var partnersApiService = MauiProgram.Services.GetService<IPartnersApiService>();
            var walletService = MauiProgram.Services.GetService<IWalletService>();
            var authService = MauiProgram.Services.GetService<IAuthService>();
            var authenticationService = MauiProgram.Services.GetService<Infrastructure.Auth.IAuthenticationService>();

            BindingContext = new MainPageViewModel(bannerApiService, partnersApiService, walletService, authService, authenticationService);

            BindingContextChanged += (_, __) =>
            {
                if (BindingContext is MainPageViewModel vm)
                {
                    vm.PropertyChanged -= OnVmPropertyChanged;
                    vm.PropertyChanged += OnVmPropertyChanged;
                }
            };
        }


        // ============================
        // OnAppearing
        // ============================
        protected override async void OnAppearing()
        {
            base.OnAppearing();

            _imgA ??= FindByName("StoryImageA") as Image;
            _imgB ??= FindByName("StoryImageB") as Image;

            _row1 ??= FindByName("Row1") as ScrollView;
            _row2 ??= FindByName("Row2") as ScrollView;
            _row3 ??= FindByName("Row3") as ScrollView;

            // Фикс готовности рядов
            HookSizeReady(_row1, r => _row1Ready = r);
            HookSizeReady(_row2, r => _row2Ready = r);
            HookSizeReady(_row3, r => _row3Ready = r);

            HookPartnerRows();

            // ДОП. ФИКС — ждём загрузки контента (BindLayout)
            await Task.Delay(300);
            StartSmoothAutoScroll();

            // Navbar
            if (BottomBar != null)
                BottomBar.UpdateSelectedTab("Home");

            // Story timeline grid width
            if (BindingContext is MainPageViewModel viewModel)
            {
                var progressContainer = FindByName("ProgressTimelineContainer") as Grid;
                if (progressContainer != null)
                {
                    progressContainer.SizeChanged += OnProgressTimelineContainerSizeChanged;

                    if (progressContainer.Width > 0)
                        viewModel.ProgressTimelineContainerWidth = progressContainer.Width;
                }

                await viewModel.RefreshUserAsync();
            }
        }


        // ============================
        // OnDisappearing
        // ============================
        protected override void OnDisappearing()
        {
            base.OnDisappearing();

            UnhookPartnerRows();
            StopSmoothAutoScroll();

            var vm = BindingContext as MainPageViewModel;
            if (vm != null)
                vm.PropertyChanged -= OnVmPropertyChanged;

            var progressContainer = FindByName("ProgressTimelineContainer") as Grid;
            if (progressContainer != null)
                progressContainer.SizeChanged -= OnProgressTimelineContainerSizeChanged;
        }


        // ============================
        // Banner size fix
        // ============================
        protected override void OnSizeAllocated(double width, double height)
        {
            base.OnSizeAllocated(width, height);

            var banners = FindByName("BannersCollection") as CollectionView;
            if (banners != null)
                banners.HeightRequest = 90;
        }


        private void OnProgressTimelineContainerSizeChanged(object? sender, EventArgs e)
        {
            if (sender is Grid container && BindingContext is MainPageViewModel vm)
            {
                if (container.Width > 0)
                    vm.ProgressTimelineContainerWidth = container.Width;
            }
        }


        // ============================
        // Story crossfade
        // ============================
        private async void OnVmPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (BindingContext is not MainPageViewModel vm)
                return;

            if (e.PropertyName == nameof(MainPageViewModel.IsStoryOpen))
            {
                if (vm.IsStoryOpen)
                {
                    await Task.Delay(50);
                    var progressContainer = FindByName("ProgressTimelineContainer") as Grid;
                    if (progressContainer != null && progressContainer.Width > 0)
                        vm.ProgressTimelineContainerWidth = progressContainer.Width;
                }
                return;
            }

            if (e.PropertyName != nameof(MainPageViewModel.CurrentPageImage))
                return;

            var nextSrc = vm.CurrentPageImage;
            if (string.IsNullOrWhiteSpace(nextSrc))
                return;

            _imgA ??= FindByName("StoryImageA") as Image;
            _imgB ??= FindByName("StoryImageB") as Image;

            if (_imgA == null || _imgB == null)
                return;

            _swapCts?.Cancel();
            _swapCts = new CancellationTokenSource();
            var ct = _swapCts.Token;

            try
            {
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    var top = _topIsA ? _imgA : _imgB;
                    var bottom = _topIsA ? _imgB : _imgA;

                    bottom.Opacity = 0;
                    bottom.Source = nextSrc;

                    await Task.Delay(50, ct);
                    await bottom.FadeTo(1, 250, Easing.Linear);

                    _topIsA = !_topIsA;

                    top.Source = null;
                    top.Opacity = 0;
                });
            }
            catch { }
        }


        // ============================
        // Готовность рядов
        // ============================
        private void HookSizeReady(ScrollView? row, Action<bool> setReady)
        {
            if (row == null)
            {
                setReady(false);
                return;
            }

            setReady(IsRowReady(row));
            row.SizeChanged += (_, __) => setReady(IsRowReady(row));

            void Once(object? s, ScrolledEventArgs e)
            {
                setReady(IsRowReady(row));
                row.Scrolled -= Once;
            }

            row.Scrolled += Once;
        }

        private static bool IsRowReady(ScrollView row)
        {
            return row.ContentSize.Width > row.Width + 20;
        }


        // ============================
        // Обработчики скрола
        // ============================
        private void HookPartnerRows()
        {
            Attach(_row1);
            Attach(_row2);
            Attach(_row3);

            void Attach(ScrollView? sv)
            {
                if (sv == null) return;

                sv.Scrolled += OnAnyRowScrolled;
            }
        }

        private void UnhookPartnerRows()
        {
            Detach(_row1);
            Detach(_row2);
            Detach(_row3);

            void Detach(ScrollView? sv)
            {
                if (sv == null) return;
                sv.Scrolled -= OnAnyRowScrolled;
            }
        }

        private void OnAnyRowScrolled(object? sender, ScrolledEventArgs e)
        {
            _lastTouch = DateTime.Now;

            if (sender is ScrollView sv)
                SeamlessWrap(sv);
        }


        // ============================
        // Автоскролл
        // ============================
        private void StartSmoothAutoScroll()
        {
            StopSmoothAutoScroll();
            _autoScrollCts = new CancellationTokenSource();
            _ = RunAutoScrollAsync(_autoScrollCts.Token);
        }

        private void StopSmoothAutoScroll()
        {
            _autoScrollCts?.Cancel();
            _autoScrollCts = null;
        }

        private async Task RunAutoScrollAsync(CancellationToken token)
        {
            var sw = new System.Diagnostics.Stopwatch();
            sw.Start();

            while (!token.IsCancellationRequested)
            {
                if ((DateTime.Now - _lastTouch).TotalSeconds >= IdleSeconds)
                {
                    double dt = sw.Elapsed.TotalSeconds;
                    sw.Restart();

                    if (_row1Ready) await StepSmoothScroll(_row1, SpeedRow1 * dt);
                    if (_row2Ready) await StepSmoothScroll(_row2, SpeedRow2 * dt);
                    if (_row3Ready) await StepSmoothScroll(_row3, SpeedRow3 * dt);
                }
                else
                {
                    sw.Restart();
                }

                await Task.Delay(16, token);
            }
        }

        private async Task StepSmoothScroll(ScrollView? sv, double delta)
        {
            if (sv == null) return;

            double contentWidth = sv.ContentSize.Width;
            double viewportWidth = sv.Width;

            if (contentWidth <= viewportWidth)
                return;

            double newX = sv.ScrollX + delta;

            double half = contentWidth / 2;

            if (newX > half)
                newX -= half;
            else if (newX < 0)
                newX += half;

            try
            {
                await MainThread.InvokeOnMainThreadAsync(() =>
                    sv.ScrollToAsync(newX, 0, false));
            }
            catch { }
        }

        private void SeamlessWrap(ScrollView sv)
        {
            double contentWidth = sv.ContentSize.Width;
            double viewportWidth = sv.Width;

            if (contentWidth <= viewportWidth)
                return;

            double half = contentWidth / 2;
            double x = sv.ScrollX;

            if (x > half + 2)
                _ = sv.ScrollToAsync(x - half, 0, false);
            else if (x < -2)
                _ = sv.ScrollToAsync(x + half, 0, false);
        }


        // ============================
        // Навигация
        // ============================
        private async void OnWalletTapped(object? sender, EventArgs e)
        {
            if (_isNavigating) return;

            _isNavigating = true;
            try
            {
                await Shell.Current.GoToAsync(WalletRoute);
            }
            catch
            {
                try { await Shell.Current.GoToAsync("//wallet"); } catch { }
            }
            finally
            {
                _isNavigating = false;
            }
        }

        private async void OnHistoryClicked(object? sender, EventArgs e)
        {
            if (_isNavigating) return;
            _isNavigating = true;

            try
            {
                await Shell.Current.GoToAsync(nameof(TransactionsPage));
            }
            finally
            {
                _isNavigating = false;
            }
        }


        private async void OnMoreTapped(object sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("//main/partner");
        }


        private async void OnCategoryTapped(object? sender, EventArgs e)
        {
            if (_isNavigating) return;

            _isNavigating = true;

            try
            {
                string? slug = null;
                string? name = null;

                if (sender is Frame frame)
                {
                    var tap = frame.GestureRecognizers
                        .OfType<TapGestureRecognizer>()
                        .FirstOrDefault();

                    if (tap?.CommandParameter is string param)
                    {
                        var map = new Dictionary<string, (string slug, string name)>
                        {
                            { "beauty", ("beauty", "Салоны красоты") },
                            { "pharmacy", ("pharmacy", "Аптеки") },
                            { "groceries", ("groceries", "Магазины") }
                        };

                        if (map.TryGetValue(param, out var data))
                        {
                            slug = data.slug;
                            name = data.name;
                        }
                    }
                }

                if (slug == null)
                {
                    await Shell.Current.GoToAsync("///PartnersListPage");
                }
                else
                {
                    var route =
                        $"///PartnersListPage?categorySlug={Uri.EscapeDataString(slug)}&categoryName={Uri.EscapeDataString(name!)}";

                    await Shell.Current.GoToAsync(route);
                }
            }
            finally
            {
                _isNavigating = false;
            }
        }
    }
}
