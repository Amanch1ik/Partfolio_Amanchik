using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Maui.ApplicationModel; // MainThread
using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using YessGoFront.Models;
using YessGoFront.Services;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;
using System.Collections.Generic;
using YessGoFront.Infrastructure.Auth;
using YessGoFront.Infrastructure;

namespace YessGoFront.ViewModels
{
    public partial class MainPageViewModel : ObservableObject
    {
        // ====== Коллекции ======
        public ObservableCollection<StoryModel> Stories { get; } = new();
        public ObservableCollection<BannerModel> Banners { get; } = new();
        public ObservableCollection<CategoryModel> TopCategories { get; } = new();

        public ObservableCollection<PartnerLogoModel> PartnersRow1 { get; } = new();
        public ObservableCollection<PartnerLogoModel> PartnersRow2 { get; } = new();
        public ObservableCollection<PartnerLogoModel> PartnersRow3 { get; } = new();

        // ====== Оверлеи / состояние сторис ======
        [ObservableProperty] private bool isStoryOpen;
        [ObservableProperty] private StoryModel? currentStory;

        [ObservableProperty] private bool isBannerOpen;
        [ObservableProperty] private BannerModel? currentBanner;

        // Индексы текущего сторис и страницы
        [ObservableProperty] private int currentStoryIndex = -1;
        [ObservableProperty] private int currentPageIndex = -1;

        // Текущее изображение страницы (безопасно для XAML)
        [ObservableProperty] private string? currentPageImage;

        // Прогресс текущей страницы (0..1) + список прогрессов сегментов
        [ObservableProperty] private double pageProgress; // 0..1
        public ObservableCollection<double> PageProgressList { get; } = new();
        
        // Количество страниц в текущем сторис (для правильного расчета ширины прогресс-баров)
        public int CurrentStoryPageCount => CurrentStory?.Pages?.Count ?? 0;

        // Ширина контейнера прогресс-бара (обновляется через SizeChanged)
        [ObservableProperty] 
        private double progressTimelineContainerWidth = 0;

        // Автоматически обновляем CurrentStoryPageCount при изменении CurrentStory
        partial void OnCurrentStoryChanged(StoryModel? value)
        {
            OnPropertyChanged(nameof(CurrentStoryPageCount));
        }

        // Баланс берём из общего BalanceStore
        public string Balance => BalanceStore.Instance.Balance.ToString("0.##");

        // Данные пользователя из локальной БД
        [ObservableProperty] private string displayName = string.Empty;
        [ObservableProperty] private string phone = string.Empty;

        private CancellationTokenSource? _overlayCts;
        private readonly IBannerApiService? _bannerApiService;
        private readonly IPartnersApiService? _partnersApiService;
        private readonly IWalletService? _walletService;
        private readonly IAuthService? _authService;
        private readonly Infrastructure.Auth.IAuthenticationService? _authenticationService;

        // ====== Команды ======
        public IAsyncRelayCommand<StoryModel> OpenStoryAsyncCommand { get; }
        public IRelayCommand CloseStoryCommand { get; }
        public IRelayCommand NextPageCommand { get; }
        public IRelayCommand PrevPageCommand { get; }

        public IAsyncRelayCommand<BannerModel> OpenBannerAsyncCommand { get; }
        public IRelayCommand CloseBannerCommand { get; }
        
        public IAsyncRelayCommand<PartnerLogoModel> OpenPartnerAsyncCommand { get; }

        public MainPageViewModel(
            IBannerApiService? bannerApiService = null,
            IPartnersApiService? partnersApiService = null,
            IWalletService? walletService = null,
            IAuthService? authService = null,
            Infrastructure.Auth.IAuthenticationService? authenticationService = null)
        {
            _bannerApiService = bannerApiService;
            _partnersApiService = partnersApiService;
            _walletService = walletService;
            _authService = authService;
            _authenticationService = authenticationService;
            
            // Подписка на изменение баланса — обновляем метку на главной
            BalanceStore.Instance.PropertyChanged += (_, e) =>
            {
                if (e.PropertyName == nameof(BalanceStore.Balance))
                    OnPropertyChanged(nameof(Balance));
            };

            LoadStories();
            _ = LoadBannersAsync(); // Асинхронная загрузка баннеров с сервера
            LoadTopCategories();
            _ = LoadPartnersAsync(); // Асинхронная загрузка партнёров с сервера

            // Инициализация команд для сторис
            OpenStoryAsyncCommand = new AsyncRelayCommand<StoryModel?>(OpenStoryAsync);
            CloseStoryCommand = new RelayCommand(CloseStory);
            NextPageCommand = new RelayCommand(() => NextPage());
            PrevPageCommand = new RelayCommand(() => PrevPage());

            // Инициализация команд для баннеров
            OpenBannerAsyncCommand = new AsyncRelayCommand<BannerModel?>(OpenBannerAsync);
            CloseBannerCommand = new RelayCommand(CloseBanner);
            
            // Команда для открытия партнёра создаётся автоматически через [RelayCommand] на методе OpenPartnerAsync
            // Но нужно явно создать её для правильной работы биндинга
            OpenPartnerAsyncCommand = new AsyncRelayCommand<PartnerLogoModel>(OpenPartnerAsync);

            // Загружаем баланс кошелька текущего пользователя (если сервис доступен)
            _ = LoadBalanceAsync();
            
            // Загружаем данные пользователя из локальной БД
            _ = LoadUserAsync();
        }

        // ====== ДАННЫЕ ======
        private void LoadStories()
        {
            Stories.Clear();

            Stories.Add(new StoryModel
            {
                Title = "Бонусы",
                Icon = "sc_bonus.png",
                Pages = new() {
                    "storiespage_bonus.png",
                }
            });

            Stories.Add(new StoryModel
            {
                Title = "Yess!Coin",
                Icon = "stories_yesscoin.png",
                Pages = new() {
                    "storiespage_yesscoin.png",
                }
            });

            Stories.Add(new StoryModel
            {
                Title = "Мы",
                Icon = "sc_we.png",
                Pages = new() {
                    "we_stories.png",
                }
            });

            Stories.Add(new StoryModel
            {
                Title = "Акции",
                Icon = "stories_sales.png",
                Pages = new() {
                    "sales_stories1.png",
                    "sales_stories2.png",
                    "sales_stories3.png",
                    "sales_stories4.png",
                }
            });

            Stories.Add(new StoryModel
            {
                Title = "ДР",
                Icon = "stories_bday.png",
                Pages = new() {
                    "storiespage_bday.png",
                }
            });
        }

        private async Task LoadBalanceAsync()
        {
            try
            {
                if (_walletService == null)
                    return;

                var balance = await _walletService.GetBalanceAsync();
                BalanceStore.Instance.Balance = balance;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Error loading wallet balance: {ex.Message}");
            }
        }

        private async Task LoadUserAsync()
        {
            try
            {
                if (_authService == null)
                    return;

                var localUser = await _authService.GetLocalUserAsync();
                if (localUser != null)
                {
                    // Если телефон пустой в локальной БД, пытаемся получить его из токена
                    var phone = localUser.Phone;
                    if (string.IsNullOrWhiteSpace(phone) && _authenticationService != null)
                    {
                        try
                        {
                            var accessToken = await _authenticationService.GetAccessTokenAsync();
                            if (!string.IsNullOrWhiteSpace(accessToken))
                            {
                                var phoneFromToken = JwtHelper.GetPhone(accessToken);
                                if (!string.IsNullOrWhiteSpace(phoneFromToken))
                                {
                                    phone = phoneFromToken;
                                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Using phone from token: {phone}");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Failed to get phone from token: {ex.Message}");
                        }
                    }

                    // DisplayName всегда показывает ФИО из БД
                    var displayName = localUser.Name;
                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] LoadUserAsync: Initial displayName from DB = '{displayName}'");
                    
                    // Если ФИО пустое в БД, пытаемся загрузить профиль из API
                    if (string.IsNullOrWhiteSpace(displayName))
                    {
                        System.Diagnostics.Debug.WriteLine("[MainPageViewModel] Name is empty in DB, loading profile from API...");
                        try
                        {
                            var userProfile = await _authService.GetUserProfileAsync();
                            if (userProfile != null)
                            {
                                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Got profile from API: FirstName='{userProfile.FirstName}', LastName='{userProfile.LastName}'");
                                
                                // Формируем ФИО из FirstName и LastName напрямую (не используем DisplayName, так как он может вернуть телефон)
                                var firstName = userProfile.FirstName?.Trim() ?? string.Empty;
                                var lastName = userProfile.LastName?.Trim() ?? string.Empty;
                                var fullName = $"{firstName} {lastName}".Trim();
                                
                                if (!string.IsNullOrWhiteSpace(fullName))
                                {
                                    displayName = fullName;
                                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] ✅ Loaded Name from API: FirstName={firstName}, LastName={lastName}, FullName={fullName}");
                                    
                                    // Перезагружаем пользователя из БД, чтобы получить обновленное имя
                                    var updatedUser = await _authService.GetLocalUserAsync();
                                    if (updatedUser != null && !string.IsNullOrWhiteSpace(updatedUser.Name))
                                    {
                                        displayName = updatedUser.Name;
                                        System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] ✅ Updated displayName from DB after profile load: {displayName}");
                                    }
                                }
                                else
                                {
                                    displayName = "Пользователь";
                                    System.Diagnostics.Debug.WriteLine("[MainPageViewModel] ❌ FirstName and LastName are empty in API response");
                                }
                            }
                            else
                            {
                                displayName = "Пользователь";
                                System.Diagnostics.Debug.WriteLine("[MainPageViewModel] ❌ API returned null profile");
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] ❌ Failed to load profile from API: {ex.Message}");
                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Stack trace: {ex.StackTrace}");
                            displayName = "Пользователь";
                        }
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] ✅ Using Name from DB: {displayName}");
                    }

                    await MainThread.InvokeOnMainThreadAsync(() =>
                    {
                        DisplayName = displayName;
                        Phone = phone ?? string.Empty;
                    });
                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Loaded user: DisplayName={DisplayName}, Phone={Phone}");
                }
                else
                {
                    // Если нет локального пользователя, пытаемся получить данные из токена
                    string? phone = null;
                    string displayName = "Пользователь";
                    
                    if (_authenticationService != null)
                    {
                        try
                        {
                            var accessToken = await _authenticationService.GetAccessTokenAsync();
                            if (!string.IsNullOrWhiteSpace(accessToken))
                            {
                                phone = JwtHelper.GetPhone(accessToken);
                                // Пытаемся загрузить профиль из API
                                try
                                {
                                    var userProfile = await _authService.GetUserProfileAsync();
                                    if (userProfile != null)
                                    {
                                        // Формируем ФИО из FirstName и LastName напрямую
                                        var firstName = userProfile.FirstName?.Trim() ?? string.Empty;
                                        var lastName = userProfile.LastName?.Trim() ?? string.Empty;
                                        var fullName = $"{firstName} {lastName}".Trim();
                                        
                                        if (!string.IsNullOrWhiteSpace(fullName))
                                        {
                                            displayName = fullName;
                                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Loaded Name from API (no local user): FirstName={firstName}, LastName={lastName}, FullName={fullName}");
                                        }
                                    }
                                }
                                catch
                                {
                                    // Оставляем "Пользователь"
                                }
                                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Using phone from token (no local user): {phone}");
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Failed to get data from token: {ex.Message}");
                        }
                    }

                    await MainThread.InvokeOnMainThreadAsync(() =>
                    {
                        DisplayName = displayName;
                        Phone = phone ?? string.Empty;
                    });
                    System.Diagnostics.Debug.WriteLine("[MainPageViewModel] No local user found");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Error loading user: {ex.Message}");
                await MainThread.InvokeOnMainThreadAsync(() =>
                {
                    DisplayName = "Пользователь";
                    Phone = string.Empty;
                });
            }
        }

        /// <summary>
        /// Обновить данные пользователя (можно вызвать после изменения профиля)
        /// </summary>
        public async Task RefreshUserAsync()
        {
            await LoadUserAsync();
        }

        // ====== ДАННЫЕ Партнёров======
        private void LoadPartnerInfo()
        {
            // 🔹 Тестовый партнёр — пример данных для карточки
            var testPartner = new PartnerDetailDto
            {
                Id = 1,
                Name = "CoffeeTime",
                Description = "CoffeeTime — уютная кофейня с ароматным кофе, десертами и атмосферой уюта. " +
                              "Держателям карты YessGo доступны скидки до 10% и кешбэк 5%.",
                Category = "Кафе и рестораны",
                LogoUrl = "coffeetime_logo.png",     // картинка в Resources/Images/
                CoverImageUrl = "coffee_banner.png",     // опционально
                Address = "г. Бишкек, ул. Ибраимова, 115",
                Latitude = 42.8746,
                Longitude = 74.6122,
                Phone = "+996 555 123 456",
                Website = "https://coffeetime.kg",
                DefaultCashbackRate = 5.0,
                CashbackRate = 5.0,
                MaxDiscountPercent = 10.0
            };

            // 🔹 Лог: выводим информацию в Output (в будущем можно передавать на экран деталей)
            System.Diagnostics.Debug.WriteLine(
                $"[Partner Info]\n" +
                $"Название: {testPartner.Name}\n" +
                $"Категория: {testPartner.Category}\n" +
                $"Описание: {testPartner.Description}\n" +
                $"Телефон: {testPartner.Phone}\n" +
                $"Адрес: {testPartner.Address}\n" +
                $"Кешбэк: {testPartner.DefaultCashbackRate}%\n" +
                $"Макс. скидка: {testPartner.MaxDiscountPercent}%");

            // 🔹 Пример, как можно позже использовать:
            // await Shell.Current.GoToAsync($"partnerdetails?partnerId={testPartner.Id}");
        }


        private async Task LoadBannersAsync()
        {
            try
            {
#if ANDROID
                Android.Util.Log.Info("MainPageViewModel", "[LoadBannersAsync] Начало загрузки баннеров");
#endif
                System.Diagnostics.Debug.WriteLine("[MainPageViewModel] LoadBannersAsync: Начало загрузки баннеров");
                
                Banners.Clear();
                
                if (_bannerApiService != null)
                {
#if ANDROID
                    Android.Util.Log.Info("MainPageViewModel", "[LoadBannersAsync] Вызов GetActiveBannersAsync()");
#endif
                    // Загружаем баннеры с сервера
                    var bannerDtos = await _bannerApiService.GetActiveBannersAsync();
                    
#if ANDROID
                    Android.Util.Log.Info("MainPageViewModel", $"[LoadBannersAsync] Получено баннеров: {bannerDtos?.Count ?? 0}");
#endif
                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] LoadBannersAsync: Получено баннеров: {bannerDtos?.Count ?? 0}");
                    
                    if (bannerDtos != null && bannerDtos.Count > 0)
                    {
                        foreach (var dto in bannerDtos.OrderBy(b => b.Order))
                        {
                            var imageUrl = dto.ImageUrl ?? "null";
#if ANDROID
                            Android.Util.Log.Info("MainPageViewModel", $"[LoadBannersAsync] Banner: Id={dto.Id}, ImageUrl={imageUrl}");
#endif
                            System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] LoadBannersAsync: Banner: Id={dto.Id}, ImageUrl={imageUrl}");
                            
                            var banner = new BannerModel
                            {
                                Id = dto.Id.ToString(),
                                Image = dto.ImageUrl ?? string.Empty,
                                PartnerName = dto.PartnerName ?? string.Empty,
                                PartnerId = dto.PartnerId
                            };
                            Banners.Add(banner);
                            
                            // Предзагрузка изображения для более быстрого отображения
                            if (!string.IsNullOrWhiteSpace(banner.Image) && banner.IsImageUrl)
                            {
                                _ = PrefetchBannerImage(banner.Image);
                            }
                        }
#if ANDROID
                        Android.Util.Log.Info("MainPageViewModel", $"[LoadBannersAsync] Загружено {Banners.Count} баннеров с сервера");
#endif
                        System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Loaded {Banners.Count} banners from server");
                        return;
                    }
                }
                else
                {
#if ANDROID
                    Android.Util.Log.Warn("MainPageViewModel", "[LoadBannersAsync] _bannerApiService is null");
#endif
                    System.Diagnostics.Debug.WriteLine("[MainPageViewModel] LoadBannersAsync: _bannerApiService is null");
                }
                
                // Fallback на локальные изображения, если API недоступен или нет данных
                System.Diagnostics.Debug.WriteLine("[MainPageViewModel] Using fallback local banners");
#if ANDROID
                Android.Util.Log.Info("MainPageViewModel", "[LoadBannersAsync] Adding fallback local banners");
#endif
                // В MAUI файлы из Resources/Images загружаются по имени файла (с расширением)
                Banners.Add(new BannerModel { Image = "banner_1.png", PartnerName = "Партнёр A" });
                Banners.Add(new BannerModel { Image = "banner_2.png", PartnerName = "Партнёр B" });
                Banners.Add(new BannerModel { Image = "banner_3.png", PartnerName = "Партнёр C" });
#if ANDROID
                Android.Util.Log.Info("MainPageViewModel", $"[LoadBannersAsync] Added {Banners.Count} fallback banners");
#endif
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Error loading banners: {ex.Message}");
#if ANDROID
                Android.Util.Log.Error("MainPageViewModel", $"[LoadBannersAsync] Error: {ex.Message}");
                Android.Util.Log.Info("MainPageViewModel", "[LoadBannersAsync] Adding fallback local banners after error");
#endif
                // Fallback на локальные изображения при ошибке
                // В MAUI файлы из Resources/Images загружаются по имени файла (с расширением)
                Banners.Clear();
                Banners.Add(new BannerModel { Image = "banner_1.png", PartnerName = "Партнёр A" });
                Banners.Add(new BannerModel { Image = "banner_2.png", PartnerName = "Партнёр B" });
                Banners.Add(new BannerModel { Image = "banner_3.png", PartnerName = "Партнёр C" });
#if ANDROID
                Android.Util.Log.Info("MainPageViewModel", $"[LoadBannersAsync] Added {Banners.Count} fallback banners after error");
#endif
            }
        }

        private void LoadTopCategories()
        {
            TopCategories.Clear();
            TopCategories.Add(new CategoryModel { Title = "Одежда и обувь", Icon = "cat_clothes.png" });
            TopCategories.Add(new CategoryModel { Title = "Для дома", Icon = "cat_home.png" });
            TopCategories.Add(new CategoryModel { Title = "Электроника", Icon = "cat_electronics.png" });
            TopCategories.Add(new CategoryModel { Title = "Здоровье", Icon = "cat_beauty.png" });
            TopCategories.Add(new CategoryModel { Title = "Детям", Icon = "cat_kids.png" });
        }

        private async Task LoadPartnersAsync()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("[MainPageViewModel] LoadPartnersAsync: начало загрузки партнёров");

                PartnersRow1.Clear();
                PartnersRow2.Clear();
                PartnersRow3.Clear();

                if (_partnersApiService == null)
                {
                    LoadPartnersFallback();
                    return;
                }

                var partners = await _partnersApiService.GetAllAsync();

                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Получено партнёров: {partners?.Count ?? 0}");

                if (partners == null || partners.Count == 0)
                {
                    LoadPartnersFallback();
                    return;
                }

                // Приводим к единому формату
                var list = partners
                    .OfType<PartnerDto>()
                    .Select(p => new PartnerLogoModel
                    {
                        Id = p.Id.ToString(),
                        Name = p.Name ?? "",
                        Logo = p.LogoUrl ?? ""
                    })
                    .ToList();

                if (list.Count == 0)
                {
                    LoadPartnersFallback();
                    return;
                }

                // === ДЕЛИМ НА 3 РЯДА ===
                int count = list.Count;
                int perRow = Math.Max(1, count / 3);

                var row1 = list.Take(perRow).ToList();
                var row2 = list.Skip(perRow).Take(perRow).ToList();
                var row3 = list.Skip(perRow * 2).ToList();

                if (row2.Count == 0) row2 = row1.ToList();
                if (row3.Count == 0) row3 = row2.ToList();

                // === ДУБЛИРУЕМ КАЖДЫЙ РЯД (обязательно для бесшовного скролла) ===
                row1 = row1.Concat(row1).ToList();
                row2 = row2.Concat(row2).ToList();
                row3 = row3.Concat(row3).ToList();

                // === ДЕЛАЕМ ВСЕ РЯДЫ ОДИНАКОВЫМИ ПО ДЛИНЕ ===
                row1 = EnsureEnough(row1);
                row2 = EnsureEnough(row2);
                row3 = EnsureEnough(row3);

                // === ЗАПОЛНЯЕМ КОЛЛЕКЦИИ ДЛЯ UI ===
                foreach (var p in row1) PartnersRow1.Add(p);
                foreach (var p in row2) PartnersRow2.Add(p);
                foreach (var p in row3) PartnersRow3.Add(p);

                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] PARTNERS READY: row1={PartnersRow1.Count}, row2={PartnersRow2.Count}, row3={PartnersRow3.Count}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] LoadPartnersAsync ERROR: {ex.Message}");
                LoadPartnersFallback();
            }
        }

        private List<PartnerLogoModel> EnsureEnough(List<PartnerLogoModel> list)
        {
            while (list.Count < 24)
                list = list.Concat(list).ToList();

            if (list.Count > 60)
                list = list.Take(60).ToList();

            return list;
        }



        private void LoadPartnersFallback()
        {
            PartnersRow1.Clear();
            PartnersRow2.Clear();
            PartnersRow3.Clear();

            var logos = new[]
            {
                "promzona.jpg","faiza.png","navat.png","flask.png","chikenstar.jpg",
                "bublik.png","sierra.jpg","ants.jpg","supara.png","teplo.png","savetheales.png"
            };

            // Маппинг логотипов к ID партнёров (для навигации)
            var logoToIdMap = new Dictionary<string, string>
            {
                { "navat.png", "12" },  // ID "Нават" из базы данных
                { "sierra.jpg", "1" },
                { "ants.jpg", "2" },
                { "bublik.png", "3" },
                { "flask.png", "4" },
                { "supara.png", "5" },
                { "faiza.png", "6" },
                { "chikenstar.jpg", "7" },
                { "savetheales.png", "8" },
                { "promzona.jpg", "9" },
                { "teplo.png", "10" }
            };

            foreach (var l in logos) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow1.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }
            foreach (var l in logos.Reverse()) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow2.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }
            foreach (var l in logos) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow3.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }

            // дублирование — для бесшовной ленты
            foreach (var l in logos) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow1.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }
            foreach (var l in logos.Reverse()) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow2.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }
            foreach (var l in logos) 
            {
                var id = logoToIdMap.GetValueOrDefault(l, string.Empty);
                PartnersRow3.Add(new PartnerLogoModel { Logo = l, Id = id, Name = l.Replace(".png", "").Replace(".jpg", "") });
            }
        }

        // ====== СТОРИС: «как в инсте» ======

        public async Task OpenStoryAsync(StoryModel? story)
        {
            if (story == null) return;
            
            _overlayCts?.Cancel();
            _overlayCts = new CancellationTokenSource();

            CurrentStoryIndex = Math.Max(0, Stories.IndexOf(story));
            await PlayFromStoryIndexAsync(CurrentStoryIndex, _overlayCts.Token);
        }

        private async Task PlayFromStoryIndexAsync(int storyIndex, CancellationToken ct)
        {
            if (storyIndex < 0 || storyIndex >= Stories.Count) return;

            for (int s = storyIndex; s < Stories.Count; s++)
            {
                CurrentStoryIndex = s;
                CurrentStory = Stories[s];
                OnPropertyChanged(nameof(CurrentStoryPageCount)); // Обновляем количество страниц для биндинга

                var pages = CurrentStory.Pages ?? new();
                if (pages.Count == 0) continue;

                PrepareSegments(pages.Count);

                IsStoryOpen = true;

                for (int p = 0; p < pages.Count; p++)
                {
                    CurrentPageIndex = p;
                    UpdateCurrentPageImage();

                    await RunSmoothProgressAsync(p, ct);
                    if (ct.IsCancellationRequested) return;

                    // Проверяем границы перед установкой значения
                    if (p >= 0 && p < PageProgressList.Count)
                    {
                        PageProgressList[p] = 1.0;
                        OnPropertyChanged(nameof(PageProgressList));
                    }
                }
            }

            CloseStory();
        }

        private async Task RunSmoothProgressAsync(int segmentIndex, CancellationToken ct)
        {
            const int durationMs = 5500;
            var sw = Stopwatch.StartNew();

            try
            {
                _ = PrefetchNextImage();

                while (sw.ElapsedMilliseconds < durationMs && !ct.IsCancellationRequested)
                {
                    double prog = Math.Clamp(sw.Elapsed.TotalMilliseconds / durationMs, 0, 1);

                    await MainThread.InvokeOnMainThreadAsync(() =>
                    {
                        PageProgress = prog;
                        // Проверяем границы перед установкой значения
                        if (segmentIndex >= 0 && segmentIndex < PageProgressList.Count)
                        {
                            PageProgressList[segmentIndex] = prog;
                            OnPropertyChanged(nameof(PageProgressList));
                        }
                    });

                    await Task.Delay(16, ct); // ~60fps
                }
            }
            catch (TaskCanceledException)
            {
                // 🔹 Это штатная ситуация — пользователь пролистал или закрыл сторис.
                // Игнорируем отмену, чтобы не падало приложение.
            }
            catch (Exception ex)
            {
                // 🔹 Любые другие ошибки логируем, чтобы не крашилось приложение.
                System.Diagnostics.Debug.WriteLine($"[StoryProgress] Unexpected error: {ex}");
            }
            finally
            {
                sw.Stop();
            }
        }


        private void PrepareSegments(int pagesCount)
        {
            PageProgressList.Clear();
            for (int i = 0; i < pagesCount; i++) PageProgressList.Add(0.0);
            PageProgress = 0;
            OnPropertyChanged(nameof(PageProgressList));
            // Убеждаемся, что CurrentStoryPageCount обновлен для правильного расчета ширины
            OnPropertyChanged(nameof(CurrentStoryPageCount));
        }

        private void UpdateCurrentPageImage()
        {
            string? img = null;
            if (CurrentStory != null &&
                CurrentStory.Pages != null &&
                CurrentPageIndex >= 0 &&
                CurrentPageIndex < CurrentStory.Pages.Count)
            {
                img = CurrentStory.Pages[CurrentPageIndex];
            }
            CurrentPageImage = img;
        }

        private Task PrefetchNextImage()
        {
            try
            {
                if (CurrentStory == null || CurrentStory.Pages == null) return Task.CompletedTask;
                var pages = CurrentStory.Pages;
                int next = CurrentPageIndex + 1;
                if (next >= 0 && next < pages.Count)
                {
                    var path = pages[next];

                    if (Uri.TryCreate(path, UriKind.Absolute, out var absUri)
                        && (absUri.Scheme == Uri.UriSchemeHttp || absUri.Scheme == Uri.UriSchemeHttps))
                    {
                        var _ = new UriImageSource
                        {
                            Uri = absUri,
                            CachingEnabled = true,
                            CacheValidity = TimeSpan.FromHours(3)
                        };
                    }
                }
            }
            catch { }
            return Task.CompletedTask;
        }

        private Task PrefetchBannerImage(string imageUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(imageUrl))
                    return Task.CompletedTask;

                if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var absUri)
                    && (absUri.Scheme == Uri.UriSchemeHttp || absUri.Scheme == Uri.UriSchemeHttps))
                {
                    // Предзагрузка изображения в кэш для более быстрого отображения
                    var imageSource = new UriImageSource
                    {
                        Uri = absUri,
                        CachingEnabled = true,
                        CacheValidity = TimeSpan.FromDays(7)
                    };
                    // MAUI автоматически кэширует изображение при создании UriImageSource
                    System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Prefetching banner image: {imageUrl}");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPageViewModel] Error prefetching banner image: {ex.Message}");
            }
            return Task.CompletedTask;
        }

        private void NextPage()
        {
            if (!IsStoryOpen || CurrentStory == null) return;

            _overlayCts?.Cancel();

            var pages = CurrentStory.Pages ?? new();
            if (CurrentPageIndex + 1 < pages.Count)
            {
                _ = ResumeFrom(CurrentStoryIndex, CurrentPageIndex + 1);
            }
            else
            {
                _ = ResumeFrom(CurrentStoryIndex + 1, 0);
            }
        }

        private void PrevPage()
        {
            if (!IsStoryOpen) return;

            _overlayCts?.Cancel();

            if (CurrentStory != null && CurrentPageIndex - 1 >= 0)
            {
                _ = ResumeFrom(CurrentStoryIndex, CurrentPageIndex - 1);
            }
            else
            {
                int prevStory = CurrentStoryIndex - 1;
                if (prevStory >= 0)
                {
                    var prevPages = Stories[prevStory].Pages ?? new();
                    int lastPage = Math.Max(0, prevPages.Count - 1);
                    _ = ResumeFrom(prevStory, lastPage);
                }
                else
                {
                    _ = ResumeFrom(0, 0);
                }
            }
        }

        private async Task ResumeFrom(int storyIndex, int pageIndex)
        {
            _overlayCts = new CancellationTokenSource();

            CurrentStoryIndex = Math.Clamp(storyIndex, 0, Stories.Count - 1);
            CurrentStory = Stories[CurrentStoryIndex];
            OnPropertyChanged(nameof(CurrentStoryPageCount)); // Обновляем количество страниц для биндинга

            var pages = CurrentStory.Pages ?? new();
            if (pages.Count == 0) { CloseStory(); return; }

            PrepareSegments(pages.Count);
            for (int i = 0; i < pages.Count && i < PageProgressList.Count; i++)
            {
                PageProgressList[i] = i < pageIndex ? 1.0 : 0.0;
            }
            OnPropertyChanged(nameof(PageProgressList));

            IsStoryOpen = true;

            CurrentPageIndex = Math.Clamp(pageIndex, 0, pages.Count - 1);
            UpdateCurrentPageImage();

            for (int p = CurrentPageIndex; p < pages.Count; p++)
            {
                CurrentPageIndex = p;
                UpdateCurrentPageImage();

                await RunSmoothProgressAsync(p, _overlayCts.Token);
                if (_overlayCts.IsCancellationRequested) return;

                // Проверяем границы перед установкой значения
                if (p >= 0 && p < PageProgressList.Count)
                {
                    PageProgressList[p] = 1.0;
                    OnPropertyChanged(nameof(PageProgressList));
                }
            }

            int nextStory = CurrentStoryIndex + 1;
            if (nextStory < Stories.Count)
            {
                await PlayFromStoryIndexAsync(nextStory, _overlayCts.Token);
            }
            else
            {
                CloseStory();
            }
        }

        public void CloseStory()
        {
            _overlayCts?.Cancel();
            IsStoryOpen = false;
            CurrentStory = null;
            CurrentStoryIndex = -1;
            CurrentPageIndex = -1;
            CurrentPageImage = null;
            PageProgress = 0;
            PageProgressList.Clear();
            OnPropertyChanged(nameof(PageProgressList));
        }

        // ====== Баннеры ======
        public async Task OpenBannerAsync(BannerModel? banner)
        {
            if (banner == null) return;
            
            _overlayCts?.Cancel();
            _overlayCts = new CancellationTokenSource();

            CurrentBanner = banner;
            IsBannerOpen = true;

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(25), _overlayCts.Token);
            }
            catch (TaskCanceledException) { }
            finally
            {
                if (!_overlayCts.IsCancellationRequested)
                    IsBannerOpen = false;
            }
        }

        public void CloseBanner()
        {
            _overlayCts?.Cancel();
            IsBannerOpen = false;
            CurrentBanner = null;
        }


        public async Task OpenPartnerAsync(PartnerLogoModel partner)
        {
            if (partner == null)
            {
                System.Diagnostics.Debug.WriteLine("[MainPage] OpenPartnerAsync: partner is null");
                return;
            }

            // 🔹 Для проверки — выведем лог
            System.Diagnostics.Debug.WriteLine($"[MainPage] Нажали на партнёра: Name='{partner.Name}', ID='{partner.Id}'");

            try
            {
                // Используем ID партнёра для навигации
                if (!string.IsNullOrWhiteSpace(partner.Id))
                {
                    // Используем абсолютный путь с тремя слешами для навигации к зарегистрированному маршруту
                    var route = $"///partnerdetails?partnerId={Uri.EscapeDataString(partner.Id)}";
                    System.Diagnostics.Debug.WriteLine($"[MainPage] Navigating to: {route}");
                    await Shell.Current.GoToAsync(route);
                    System.Diagnostics.Debug.WriteLine("[MainPage] Navigation completed successfully");
                }
                else if (!string.IsNullOrWhiteSpace(partner.Name))
                {
                    // Fallback: используем имя, если ID не указан
                    var route = $"///partnerdetails?partnerName={Uri.EscapeDataString(partner.Name)}";
                    System.Diagnostics.Debug.WriteLine($"[MainPage] Navigating by name to: {route}");
                    await Shell.Current.GoToAsync(route);
                    System.Diagnostics.Debug.WriteLine("[MainPage] Navigation completed successfully");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[MainPage] Не удалось открыть партнёра: нет ID и имени");
                    await MainThread.InvokeOnMainThreadAsync(async () =>
                    {
                        await Application.Current?.MainPage?.DisplayAlert("Ошибка", "Не удалось открыть информацию о партнёре", "OK");
                    });
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MainPage] Ошибка навигации к партнёру: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[MainPage] Stack trace: {ex.StackTrace}");
                
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    await Application.Current?.MainPage?.DisplayAlert("Ошибка", $"Не удалось открыть партнёра: {ex.Message}", "OK");
                });
            }
        }
    }
}
