using Mapsui;
using Mapsui.Layers;
using Mapsui.Projections;
using Mapsui.Providers;
using Mapsui.Styles;
using Mapsui.Tiling;
using Mapsui.UI.Maui;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.ApplicationModel;
using System.Collections.ObjectModel;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Models;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;
using YessGoFront.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using SkiaSharp;
using Mapsui.Rendering.Skia;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.Views
{
    public partial class MapPage : ContentPage
    {
        private readonly IPartnersService? _partnersService;
        private readonly ILogger<MapPage>? _logger;
        private readonly ILocationService? _locationService;
        private readonly IImageCacheService? _imageCacheService;
        private readonly ObservableCollection<CategoryFilter> _categories = new();
        private readonly Dictionary<int, PartnerLocationDto> _partnerLocations = new();
        private string? _selectedCategory;
        private string? _selectedCategorySlug;
        private string? _searchQuery;
        private readonly IHttpClientFactory? _httpClientFactory;
        private System.Threading.Timer? _searchDebounceTimer;
        private bool _isLoading;
        private Location? _userLocation; // Текущее местоположение пользователя
        private readonly Dictionary<string, int> _bitmapCache = new(); // Кэш ID битмапов для Mapsui
        private readonly Dictionary<int, SKBitmap> _bitmapStorage = new(); // Хранилище битмапов

        private Mapsui.UI.Maui.MapView? MapView { get; set; }

        private bool _isInitialized = false;

        public MapPage()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("[MapPage] === НАЧАЛО КОНСТРУКТОРА ===");
                InitializeComponent();
                System.Diagnostics.Debug.WriteLine("[MapPage] InitializeComponent выполнен");
                
                // Получаем сервисы из DI
                _partnersService = MauiProgram.Services.GetService<IPartnersService>();
                _logger = MauiProgram.Services.GetService<ILogger<MapPage>>();
                _httpClientFactory = MauiProgram.Services.GetService<IHttpClientFactory>();
                _locationService = MauiProgram.Services.GetService<ILocationService>() 
                    ?? new LocationService(MauiProgram.Services.GetService<ILogger<LocationService>>());
                _imageCacheService = MauiProgram.Services.GetService<IImageCacheService>();
                
                System.Diagnostics.Debug.WriteLine("[MapPage] Сервисы получены");
                
                // НЕ создаём MapView в конструкторе - отложим до OnAppearing
                // Это предотвратит краш при создании страницы
                
                System.Diagnostics.Debug.WriteLine("[MapPage] === КОНЕЦ КОНСТРУКТОРА ===");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MapPage] КРИТИЧЕСКАЯ ОШИБКА В КОНСТРУКТОРЕ: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Stack trace: {ex.StackTrace}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Inner exception: {ex.InnerException?.Message}");
                _logger?.LogError(ex, "[MapPage] Ошибка при инициализации MapPage: {Message}", ex.Message);
                // НЕ пробрасываем исключение, чтобы страница могла загрузиться
            }
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            
            try
            {
                System.Diagnostics.Debug.WriteLine("[MapPage] === OnAppearing НАЧАЛО ===");
                
                // Инициализируем MapView только при первом появлении страницы
                if (!_isInitialized)
                {
                    System.Diagnostics.Debug.WriteLine("[MapPage] Инициализация MapView...");
                    await InitializeMapView();
                    _isInitialized = true;
                    System.Diagnostics.Debug.WriteLine("[MapPage] MapView инициализирован");
                }
                
                // Загружаем категории из API
                await InitializeCategoriesAsync();
                
                // Загружаем партнёров на карту
                await LoadPartnersOnMap();
                
                // Запрашиваем разрешение на геолокацию и центрируем карту
                await RequestLocationAndCenterMap();
                
                System.Diagnostics.Debug.WriteLine("[MapPage] === OnAppearing ЗАВЕРШЕНО ===");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MapPage] ОШИБКА В OnAppearing: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Stack trace: {ex.StackTrace}");
                _logger?.LogError(ex, "[MapPage] Ошибка в OnAppearing: {Message}", ex.Message);
                
                // Показываем сообщение об ошибке пользователю
                await DisplayAlert("Ошибка", "Не удалось загрузить карту. Попробуйте позже.", "OK");
            }
        }

        private async Task InitializeMapView()
        {
            // Используем TaskCompletionSource для безопасной инициализации
            var tcs = new TaskCompletionSource<bool>();
            
            try
            {
#if ANDROID
                Log.Info("MapPage", "=== InitializeMapView НАЧАЛО ===");
#endif
                System.Diagnostics.Debug.WriteLine("[MapPage] InitializeMapView начат");
                
                // Проверяем, что MapContainer существует
                if (MapContainer == null)
                {
#if ANDROID
                    Log.Error("MapPage", "MapContainer == null");
#endif
                    System.Diagnostics.Debug.WriteLine("[MapPage] ОШИБКА: MapContainer == null");
                    throw new InvalidOperationException("MapContainer не найден в XAML");
                }
                
                // Создаём MapView в главном потоке UI (обязательно!)
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    try
                    {
#if ANDROID
                        Log.Info("MapPage", "Создание MapView в главном потоке...");
#endif
                        System.Diagnostics.Debug.WriteLine("[MapPage] Создание MapView в главном потоке...");
                        
                        // Создаём MapView программно
                        MapView = new Mapsui.UI.Maui.MapView
                        {
                            BackgroundColor = Microsoft.Maui.Graphics.Color.FromArgb("#E0E0E0"),
                            VerticalOptions = LayoutOptions.FillAndExpand,
                            HorizontalOptions = LayoutOptions.FillAndExpand
                        };
                        
#if ANDROID
                        Log.Info("MapPage", "MapView создан, добавление в контейнер...");
#endif
                        System.Diagnostics.Debug.WriteLine("[MapPage] MapView создан, добавление в контейнер...");
                        
                        // Добавляем MapView в контейнер
                        MapContainer.Children.Add(MapView);
                        
#if ANDROID
                        Log.Info("MapPage", "MapView добавлен в контейнер");
#endif
                        System.Diagnostics.Debug.WriteLine("[MapPage] MapView добавлен в контейнер");
                        
                        // Небольшая задержка перед инициализацией карты
                        Task.Delay(200).ContinueWith(_ =>
                        {
                            try
                            {
                                MainThread.BeginInvokeOnMainThread(() =>
                                {
                                    try
                                    {
#if ANDROID
                                        Log.Info("MapPage", "Инициализация карты...");
#endif
                                        System.Diagnostics.Debug.WriteLine("[MapPage] Инициализация карты...");
                                        InitializeMap();
#if ANDROID
                                        Log.Info("MapPage", "Карта инициализирована");
#endif
                                        System.Diagnostics.Debug.WriteLine("[MapPage] Карта инициализирована");
                                        
                                        tcs.SetResult(true);
                                        
                                        // Инициализируем категории асинхронно (fire-and-forget)
                                        _ = InitializeCategoriesAsync();
                                    }
                                    catch (Exception ex)
                                    {
#if ANDROID
                                        Log.Error("MapPage", $"ОШИБКА при инициализации карты: {ex.Message}");
#endif
                                        System.Diagnostics.Debug.WriteLine($"[MapPage] ОШИБКА при инициализации карты: {ex.Message}");
                                        tcs.SetException(ex);
                                    }
                                });
                            }
                            catch (Exception ex)
                            {
#if ANDROID
                                Log.Error("MapPage", $"ОШИБКА в задержке: {ex.Message}");
#endif
                                tcs.SetException(ex);
                            }
                        });
                    }
                    catch (Exception ex)
                    {
#if ANDROID
                        Log.Error("MapPage", $"ОШИБКА при создании MapView: {ex.Message}\n{ex.StackTrace}");
#endif
                        System.Diagnostics.Debug.WriteLine($"[MapPage] ОШИБКА при создании MapView: {ex.Message}");
                        System.Diagnostics.Debug.WriteLine($"[MapPage] Stack trace: {ex.StackTrace}");
                        tcs.SetException(ex);
                    }
                });
                
                // Ждём завершения инициализации (с таймаутом)
                await Task.WhenAny(tcs.Task, Task.Delay(5000));
                
                if (!tcs.Task.IsCompleted)
                {
#if ANDROID
                    Log.Warn("MapPage", "Таймаут инициализации MapView");
#endif
                    throw new TimeoutException("Таймаут инициализации MapView");
                }
                
                if (tcs.Task.IsFaulted)
                {
                    throw tcs.Task.Exception?.InnerException ?? tcs.Task.Exception ?? new Exception("Неизвестная ошибка");
                }
                
#if ANDROID
                Log.Info("MapPage", "=== InitializeMapView ЗАВЕРШЕНО УСПЕШНО ===");
#endif
                System.Diagnostics.Debug.WriteLine("[MapPage] InitializeMapView завершён успешно");
            }
            catch (Exception ex)
            {
#if ANDROID
                Log.Error("MapPage", $"КРИТИЧЕСКАЯ ОШИБКА В InitializeMapView: {ex.Message}\n{ex.StackTrace}");
#endif
                System.Diagnostics.Debug.WriteLine($"[MapPage] ОШИБКА В InitializeMapView: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Stack trace: {ex.StackTrace}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Inner exception: {ex.InnerException?.Message}");
                _logger?.LogError(ex, "[MapPage] Ошибка в InitializeMapView: {Message}", ex.Message);
                throw;
            }
        }

        protected override void OnDisappearing()
        {
            base.OnDisappearing();
            _searchDebounceTimer?.Dispose();
        }

        protected override void OnNavigatedFrom(NavigatedFromEventArgs args)
        {
            base.OnNavigatedFrom(args);
            
            // Освобождаем битмапы при уходе со страницы
            foreach (var bitmap in _bitmapStorage.Values)
            {
                bitmap?.Dispose();
            }
            _bitmapStorage.Clear();
            _bitmapCache.Clear();
        }

        private void InitializeMap()
        {
            if (MapView == null)
            {
                System.Diagnostics.Debug.WriteLine("[MapPage] MapView is null, cannot initialize map");
                _logger?.LogError("[MapPage] MapView is null, cannot initialize map");
                return;
            }

            try
            {
                System.Diagnostics.Debug.WriteLine("[MapPage] InitializeMap начат");
                
                // Создаём карту (используем Mapsui.Map явно)
                var map = new Mapsui.Map();
                System.Diagnostics.Debug.WriteLine("[MapPage] Mapsui.Map создан");

                // Добавляем слой OpenStreetMap с уникальным User-Agent
                // OpenStreetMap требует уникальный User-Agent для избежания блокировок
                System.Diagnostics.Debug.WriteLine("[MapPage] Создание слоя OpenStreetMap...");
                var userAgent = "YessGoApp/1.0 (com.yessgo.front)";
                var osmLayer = OpenStreetMap.CreateTileLayer(userAgent);
                map.Layers.Add(osmLayer);
                System.Diagnostics.Debug.WriteLine("[MapPage] Слой OpenStreetMap добавлен с User-Agent");

                // Устанавливаем карту в MapView
                System.Diagnostics.Debug.WriteLine("[MapPage] Установка карты в MapView...");
                MapView.Map = map;
                System.Diagnostics.Debug.WriteLine("[MapPage] Карта установлена в MapView");

                // Подписываемся на события карты
                MapView.Info += OnMapInfo;
                System.Diagnostics.Debug.WriteLine("[MapPage] Подписка на события карты выполнена");

                // Центрируем на Бишкеке по умолчанию
                double bishkekLon = 74.5698;
                double bishkekLat = 42.8746;
                Mapsui.MPoint bishkek = new Mapsui.MPoint(bishkekLon, bishkekLat); // longitude, latitude
                (double x, double y) mercatorCoords = SphericalMercator.FromLonLat(bishkek.X, bishkek.Y);
                Mapsui.MPoint sphericalMercatorCoordinate = new Mapsui.MPoint(mercatorCoords.x, mercatorCoords.y);
                
                // Устанавливаем начальный зум (zoom level 13)
                // Resolution для zoom level 13 примерно равен 19.1 метра на пиксель
                var resolution = 19.1;
                if (MapView?.Map != null)
                {
                    MapView.Map.Navigator.CenterOnAndZoomTo(sphericalMercatorCoordinate, resolution);
                }

                _logger?.LogInformation("Map initialized with OpenStreetMap");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error initializing map: {Message}", ex.Message);
                System.Diagnostics.Debug.WriteLine($"[MapPage] Error initializing map: {ex}");
                ShowError("Не удалось инициализировать карту");
            }
        }

        private async Task InitializeCategoriesAsync()
        {
            try
            {
                if (_httpClientFactory == null)
                {
                    _logger?.LogWarning("HttpClientFactory is null, using static categories");
                    LoadStaticCategories();
                    return;
                }

                var httpClient = _httpClientFactory.CreateClient("ApiClient");
                var endpoint = ApiEndpoints.PartnersEndpoints.Categories;
                var response = await httpClient.GetAsync(endpoint);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var apiCategories = JsonSerializer.Deserialize<List<CategoryDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    // Очищаем старые категории
                    _categories.Clear();
                    CategoriesContainer.Children.Clear();

                    // Добавляем "Все" категорию
                    var allCategory = new CategoryFilter { Name = "Все", Slug = "all", IsSelected = true };
                    _categories.Add(allCategory);
                    CreateCategoryButton(allCategory);

                    // Добавляем категории из API
                    foreach (var cat in apiCategories ?? new List<CategoryDto>())
                    {
                        var categoryFilter = new CategoryFilter 
                        { 
                            Name = cat.Name, 
                            Slug = cat.Slug ?? string.Empty,
                            IsSelected = false 
                        };
                        _categories.Add(categoryFilter);
                        CreateCategoryButton(categoryFilter);
                    }

                    _logger?.LogInformation($"Loaded {_categories.Count} categories from API");
                }
                else
                {
                    _logger?.LogWarning($"Failed to load categories: {response.StatusCode}, using static categories");
                    LoadStaticCategories();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading categories from API, using static categories");
                LoadStaticCategories();
            }
        }

        private void LoadStaticCategories()
        {
            // Fallback: статичные категории
            var categoryList = new List<CategoryFilter>
            {
                new CategoryFilter { Name = "Все", Slug = "all", IsSelected = true },
                new CategoryFilter { Name = "Красота", Slug = "beauty", IsSelected = false },
                new CategoryFilter { Name = "Еда и напитки", Slug = "food-drinks", IsSelected = false },
                new CategoryFilter { Name = "Продукты", Slug = "groceries", IsSelected = false },
                new CategoryFilter { Name = "Одежда", Slug = "clothes-shoes", IsSelected = false },
                new CategoryFilter { Name = "Электроника", Slug = "electronics", IsSelected = false },
                new CategoryFilter { Name = "Спорт", Slug = "sport-leisure", IsSelected = false }
            };

            _categories.Clear();
            CategoriesContainer.Children.Clear();

            foreach (var category in categoryList)
            {
                _categories.Add(category);
                CreateCategoryButton(category);
            }
        }

        private void CreateCategoryButton(CategoryFilter category)
        {
            var button = new Button
            {
                Text = category.Name,
                BackgroundColor = category.IsSelected 
                    ? Microsoft.Maui.Graphics.Color.FromArgb("#0F6B53") 
                    : Microsoft.Maui.Graphics.Color.FromArgb("#E5E7EB"),
                TextColor = category.IsSelected 
                    ? Microsoft.Maui.Graphics.Colors.White 
                    : Microsoft.Maui.Graphics.Color.FromArgb("#6B7280"),
                FontSize = 13,
                FontAttributes = FontAttributes.Bold,
                CornerRadius = 12,
                Padding = new Thickness(12, 8),
                Margin = new Thickness(0, 0, 0, 0)
            };

            button.Clicked += (s, e) => OnCategoryClicked(category);
            
            CategoriesContainer.Children.Add(button);
        }

        private async void OnCategoryClicked(CategoryFilter category)
        {
            // Снимаем выделение с других категорий
            foreach (var cat in _categories)
            {
                cat.IsSelected = cat.Name == category.Name;
            }

            // Обновляем визуальное состояние кнопок
            UpdateCategoryButtons();

            // Фильтруем партнёров на карте по slug
            if (category.Slug == "all" || string.IsNullOrEmpty(category.Slug))
            {
                _selectedCategory = null;
                _selectedCategorySlug = null;
            }
            else
            {
                _selectedCategory = category.Name;
                _selectedCategorySlug = category.Slug;
            }
            
            await LoadPartnersOnMap();
        }

        private void UpdateCategoryButtons()
        {
            int index = 0;
            foreach (var category in _categories)
            {
                if (index < CategoriesContainer.Children.Count)
                {
                    if (CategoriesContainer.Children[index] is Button button)
                    {
                        button.BackgroundColor = category.IsSelected 
                            ? Microsoft.Maui.Graphics.Color.FromArgb("#0F6B53") 
                            : Microsoft.Maui.Graphics.Color.FromArgb("#E5E7EB");
                        button.TextColor = category.IsSelected 
                            ? Microsoft.Maui.Graphics.Colors.White 
                            : Microsoft.Maui.Graphics.Color.FromArgb("#6B7280");
                        button.Opacity = category.IsSelected ? 1.0 : 0.8;
                    }
                }
                index++;
            }
        }

        private async Task LoadPartnersOnMap()
        {
            if (_isLoading) return;
            
            _isLoading = true;
            ShowLoading(true);

            try
            {
                // Получаем локации партнёров через API
                var httpClientFactory = MauiProgram.Services.GetRequiredService<IHttpClientFactory>();
                var httpClient = httpClientFactory.CreateClient("ApiClient");
                
                var endpoint = ApiEndpoints.PartnersEndpoints.Locations;
                
                // Добавляем фильтры, если есть
                if (!string.IsNullOrWhiteSpace(_selectedCategorySlug) || !string.IsNullOrWhiteSpace(_searchQuery))
                {
                    var queryParams = new List<string>();
                    if (!string.IsNullOrWhiteSpace(_selectedCategorySlug))
                    {
                        // Используем category_slug для фильтрации
                        queryParams.Add($"category_slug={Uri.EscapeDataString(_selectedCategorySlug)}");
                    }
                    if (!string.IsNullOrWhiteSpace(_searchQuery))
                    {
                        queryParams.Add($"query={Uri.EscapeDataString(_searchQuery)}");
                    }
                    if (queryParams.Count > 0)
                    {
                        endpoint += "?" + string.Join("&", queryParams);
                    }
                }
                
                var response = await httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogWarning($"Failed to get partner locations: {response.StatusCode}");
                    ShowError("Не удалось загрузить партнёров");
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                var locations = JsonSerializer.Deserialize<List<PartnerLocationDto>>(json, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (locations == null)
                {
                    _logger?.LogInformation("No partner locations found");
                    return;
                }

                // Сохраняем локации для обработки кликов
                _partnerLocations.Clear();
                foreach (var location in locations)
                {
                    _partnerLocations[location.PartnerId] = location;
                }

                // Фильтруем по поисковому запросу, если есть
                if (!string.IsNullOrWhiteSpace(_searchQuery))
                {
                    var searchLower = _searchQuery.ToLowerInvariant();
                    locations = locations.Where(l => 
                        l.PartnerName.ToLowerInvariant().Contains(searchLower) ||
                        (l.Address?.ToLowerInvariant().Contains(searchLower) == true)
                    ).ToList();
                }

                // Проверяем, что MapView инициализирован
                if (MapView?.Map == null)
                {
                    _logger?.LogError("[MapPage] MapView or Map is null, cannot load partners");
                    return;
                }

                // Удаляем старый слой партнёров, если есть
                var existingLayer = MapView.Map.Layers.FirstOrDefault(l => l.Name == "PartnersLayer");
                if (existingLayer != null)
                {
                    MapView.Map.Layers.Remove(existingLayer);
                }

                // Создаём новый слой для партнёров
                var features = new List<IFeature>();

                foreach (var location in locations)
                {
                    // Используем координаты локации
                    if (location.Latitude.HasValue && location.Longitude.HasValue)
                    {
                        double lon = location.Longitude.Value;
                        double lat = location.Latitude.Value;
                        Mapsui.MPoint point = new Mapsui.MPoint(lon, lat);
                        (double x, double y) mercatorCoords = SphericalMercator.FromLonLat(point.X, point.Y);
                        Mapsui.MPoint sphericalMercatorCoordinate = new Mapsui.MPoint(mercatorCoords.x, mercatorCoords.y);
                        
                        // Создаём PointFeature с явным указанием типа координаты
                        Mapsui.Layers.PointFeature feature = new Mapsui.Layers.PointFeature(sphericalMercatorCoordinate);
                        feature["Name"] = location.PartnerName;
                        feature["PartnerId"] = location.PartnerId;
                        feature["Address"] = location.Address ?? string.Empty;
                        feature["LocationId"] = location.Id;
                        feature["LogoUrl"] = location.LogoUrl ?? string.Empty;

                        // Создаём кастомный маркер в стиле Яндекс.Карт
                        var markerStyle = await CreatePartnerMarkerStyleAsync(location.LogoUrl);
                        feature.Styles.Add(markerStyle);

                        features.Add(feature);
                    }
                }

                // Создаём MemoryLayer и устанавливаем Features напрямую (Mapsui 4.x API)
                if (features.Count > 0)
                {
                    var partnersLayer = new MemoryLayer("PartnersLayer");
                    
                    // В Mapsui 4.x Features может быть свойством, которое можно установить
                    try
                    {
                        var featuresProperty = typeof(MemoryLayer).GetProperty("Features");
                        if (featuresProperty != null && featuresProperty.CanWrite)
                        {
                            // Пробуем установить как List<IFeature>
                            featuresProperty.SetValue(partnersLayer, features);
                        }
                        else
                        {
                            // Альтернатива: используем MemoryProvider через рефлексию
                            var memoryProvider = new MemoryProvider(features);
                            var dataSourceProperty = typeof(MemoryLayer).GetProperty("DataSource", 
                                BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Public);
                            if (dataSourceProperty != null)
                            {
                                dataSourceProperty.SetValue(partnersLayer, memoryProvider);
                            }
                            else
                            {
                                // Последний вариант: dynamic
                                dynamic dynamicLayer = partnersLayer;
                                dynamicLayer.DataSource = memoryProvider;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Could not set Features/DataSource on PartnersLayer, trying dynamic");
                        try
                        {
                            var memoryProvider = new MemoryProvider(features);
                            dynamic dynamicLayer = partnersLayer;
                            dynamicLayer.DataSource = memoryProvider;
                        }
                        catch (Exception ex2)
                        {
                            _logger?.LogError(ex2, "All methods to set features on PartnersLayer failed");
                        }
                    }
                    
                    MapView.Map.Layers.Add(partnersLayer);
                    _logger?.LogInformation($"Loaded {features.Count} partner locations on map");
                    
                    // Обновляем карту, чтобы показать новые маркеры
                    MapView.Map.Refresh();
                }
                else
                {
                    _logger?.LogWarning("No partner locations with valid coordinates found");
                }
            }
            catch (NetworkException ex)
            {
                _logger?.LogError(ex, "Network error loading partners");
                ShowError("Нет подключения к интернету");
            }
            catch (ApiException ex)
            {
                _logger?.LogError(ex, "API error loading partners");
                ShowError("Не удалось загрузить партнёров");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading partners on map: {Message}", ex.Message);
                System.Diagnostics.Debug.WriteLine($"[MapPage] Error loading partners: {ex}");
                ShowError("Произошла ошибка при загрузке данных");
            }
            finally
            {
                _isLoading = false;
                ShowLoading(false);
            }
        }

        private async void OnMapInfo(object? sender, MapInfoEventArgs e)
        {
            try
            {
                if (e.MapInfo?.Feature == null) return;

                var feature = e.MapInfo.Feature;
                
                // Проверяем наличие поля PartnerId
                if (feature == null)
                    return;

                // Проверяем наличие поля через индексатор
                if (!feature.Fields.Contains("PartnerId"))
                    return;

                var partnerIdValue = feature["PartnerId"];
                if (partnerIdValue == null)
                    return;

                var partnerId = Convert.ToInt32(partnerIdValue);
                if (!_partnerLocations.TryGetValue(partnerId, out var location)) return;

                // Показываем улучшенное всплывающее окно с информацией о партнёре
                var message = $"📍 {location.PartnerName}";
                if (!string.IsNullOrWhiteSpace(location.Address))
                {
                    message += $"\n\n📍 Адрес: {location.Address}";
                }
                if (location.MaxDiscountPercent > 0)
                {
                    message += $"\n\n💰 Скидка до {location.MaxDiscountPercent:F0}%";
                }
                
                var actions = new List<string> { "Подробнее", "Проложить путь" };
                
                // Убираем "Проложить путь", если нет местоположения пользователя
                if (_userLocation == null || !location.Latitude.HasValue || !location.Longitude.HasValue)
                {
                    actions.Remove("Проложить путь");
                }
                
                var result = await DisplayActionSheet(
                    message,
                    "Отмена",
                    null,
                    actions.ToArray()
                );

                if (result == "Подробнее")
                {
                    await Shell.Current.GoToAsync($"///partnerdetails?partnerId={partnerId}");
                }
                else if (result == "Проложить путь" && _userLocation != null && 
                         location.Latitude.HasValue && location.Longitude.HasValue)
                {
                    await ShowRouteToPartner(_userLocation, location);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error handling map info: {Message}", ex.Message);
            }
        }

        private async Task RequestLocationAndCenterMap()
        {
            try
            {
                if (_locationService == null)
                {
                    _logger?.LogWarning("LocationService is null, using default location");
                    CenterMapOnDefaultLocation();
                    return;
                }

                var location = await _locationService.GetCurrentLocationAsync();
                
                if (location != null)
                {
                    _userLocation = location;
                    await CenterMapOnLocationAsync(location, animated: false);
                    AddUserLocationMarker(location);
                    _logger?.LogInformation($"Centered map on user location: {location.Latitude}, {location.Longitude}");
                }
                else
                {
                    _logger?.LogWarning("Could not get user location, using default");
                    CenterMapOnDefaultLocation();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting location");
                CenterMapOnDefaultLocation();
            }
        }

        private async void OnMyLocationTapped(object? sender, EventArgs e)
        {
            try
            {
                ShowLoading(true);
                
                System.Diagnostics.Debug.WriteLine("[MapPage] OnMyLocationTapped - button clicked");
                
                if (_locationService == null)
                {
                    System.Diagnostics.Debug.WriteLine("[MapPage] LocationService is null!");
                    await DisplayAlert("Ошибка", "Сервис геолокации недоступен", "OK");
                    ShowLoading(false);
                    return;
                }

                System.Diagnostics.Debug.WriteLine("[MapPage] Requesting location from LocationService...");
                var location = await _locationService.GetCurrentLocationAsync();
                
                if (location != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[MapPage] Location received: Lat={location.Latitude}, Lon={location.Longitude}");
                    _userLocation = location;
                    await CenterMapOnLocationAsync(location, animated: true);
                    AddUserLocationMarker(location);
                    _logger?.LogInformation($"Centered map on user location (button): {location.Latitude}, {location.Longitude}");
                    System.Diagnostics.Debug.WriteLine($"[MapPage] Map centered successfully on user location");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[MapPage] Location is null - showing error");
                    await DisplayAlert("Геолокация", 
                        "Не удалось определить ваше местоположение. Проверьте, что геолокация включена в настройках устройства.", 
                        "OK");
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in OnMyLocationTapped");
                System.Diagnostics.Debug.WriteLine($"[MapPage] ERROR in OnMyLocationTapped: {ex.Message}\n{ex.StackTrace}");
                await DisplayAlert("Ошибка", $"Не удалось получить местоположение: {ex.Message}", "OK");
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private async Task CenterMapOnLocationAsync(Location location, bool animated = true)
        {
            if (MapView?.Map == null) return;

            try
            {
                // Логируем координаты для отладки
                _logger?.LogInformation($"CenterMapOnLocationAsync: Lat={location.Latitude}, Lon={location.Longitude}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] CenterMapOnLocationAsync: Lat={location.Latitude}, Lon={location.Longitude}");
                
                // ВАЖНО: SphericalMercator.FromLonLat принимает (longitude, latitude)
                double userLon = location.Longitude;
                double userLat = location.Latitude;
                
                // Преобразуем в Spherical Mercator координаты
                (double x, double y) mercatorCoords = SphericalMercator.FromLonLat(userLon, userLat);
                Mapsui.MPoint sphericalMercatorCoordinate = new Mapsui.MPoint(mercatorCoords.x, mercatorCoords.y);
                
                _logger?.LogInformation($"Mercator coordinates: X={mercatorCoords.x}, Y={mercatorCoords.y}");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Mercator coordinates: X={mercatorCoords.x}, Y={mercatorCoords.y}");
                
                // Resolution для zoom level 14 примерно равен 9.5 метра на пиксель
                var resolution = 9.5;
                
                if (animated)
                {
                    // Плавная анимация: сначала приближаемся, потом центрируем
                    // Начинаем с большего разрешения (меньший зум), затем уменьшаем (больший зум)
                    var startResolution = resolution * 4; // Начальный зум (дальше)
                    
                    // Устанавливаем начальную позицию
                    MapView.Map.Navigator.CenterOnAndZoomTo(sphericalMercatorCoordinate, startResolution);
                    
                    // Анимируем приближение
                    await Task.Delay(100); // Небольшая задержка для плавности
                    
                    // Плавно уменьшаем resolution (увеличиваем зум)
                    var steps = 10;
                    for (int i = 0; i <= steps; i++)
                    {
                        var t = (double)i / steps;
                        // Используем easing функцию для плавности
                        var easedT = 1 - Math.Pow(1 - t, 3); // Ease-out cubic
                        var currentResolution = startResolution - (startResolution - resolution) * easedT;
                        
                        MapView.Map.Navigator.CenterOnAndZoomTo(sphericalMercatorCoordinate, currentResolution);
                        await Task.Delay(30); // 30ms между шагами = ~300ms общая анимация
                    }
                }
                else
                {
                    MapView.Map.Navigator.CenterOnAndZoomTo(sphericalMercatorCoordinate, resolution);
                }
                
                _logger?.LogInformation($"Map centered successfully on location");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Map centered successfully");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error centering map on location");
                System.Diagnostics.Debug.WriteLine($"[MapPage] ERROR centering map: {ex.Message}\n{ex.StackTrace}");
            }
        }

        private void CenterMapOnDefaultLocation()
        {
            // Используем координаты Бишкека по умолчанию
            var bishkekLocation = new Location(42.8746, 74.5698);
            _userLocation = bishkekLocation;
            
            System.Diagnostics.Debug.WriteLine($"[MapPage] CenterMapOnDefaultLocation: Using Bishkek (42.8746, 74.5698)");
            
            if (MapView?.Map != null)
            {
                // ВАЖНО: SphericalMercator.FromLonLat принимает (longitude, latitude)
                double bishkekLon = 74.5698;
                double bishkekLat = 42.8746;
                (double x, double y) mercatorCoords = SphericalMercator.FromLonLat(bishkekLon, bishkekLat);
                Mapsui.MPoint sphericalMercatorCoordinate = new Mapsui.MPoint(mercatorCoords.x, mercatorCoords.y);
                var resolution = 19.1; // Zoom level 13 для общего вида
                MapView.Map.Navigator.CenterOnAndZoomTo(sphericalMercatorCoordinate, resolution);
                AddUserLocationMarker(bishkekLocation);
                _logger?.LogInformation($"Centered map on default location (Bishkek)");
                System.Diagnostics.Debug.WriteLine($"[MapPage] Map centered on Bishkek successfully");
            }
        }

        private void AddUserLocationMarker(Location location)
        {
            try
            {
                if (MapView?.Map == null) return;

                System.Diagnostics.Debug.WriteLine($"[MapPage] AddUserLocationMarker: Lat={location.Latitude}, Lon={location.Longitude}");

                // Удаляем старый маркер пользователя, если есть
                var existingLayer = MapView.Map.Layers.FirstOrDefault(l => l.Name == "UserLocationLayer");
                if (existingLayer != null)
                {
                    MapView.Map.Layers.Remove(existingLayer);
                }

                // Создаём маркер местоположения пользователя
                // ВАЖНО: SphericalMercator.FromLonLat принимает (longitude, latitude)
                double userLon = location.Longitude;
                double userLat = location.Latitude;
                (double x, double y) mercatorCoords = SphericalMercator.FromLonLat(userLon, userLat);
                Mapsui.MPoint sphericalMercatorCoordinate = new Mapsui.MPoint(mercatorCoords.x, mercatorCoords.y);

                var userFeature = new Mapsui.Layers.PointFeature(sphericalMercatorCoordinate);
                userFeature["Type"] = "UserLocation";

                // Синий маркер для пользователя
                Mapsui.Styles.Color blueColor = new Mapsui.Styles.Color(0, 122, 255); // iOS blue
                Mapsui.Styles.Color whiteColor = new Mapsui.Styles.Color(255, 255, 255);
                Mapsui.Styles.Brush fillBrush = new Mapsui.Styles.Brush(blueColor);
                Mapsui.Styles.Pen outlinePen = new Mapsui.Styles.Pen(whiteColor, 3);

                userFeature.Styles.Add(new SymbolStyle
                {
                    SymbolType = SymbolType.Ellipse,
                    Fill = fillBrush,
                    Outline = outlinePen,
                    SymbolScale = 1.5f,
                    Opacity = 0.9f
                });

                var userLayer = new MemoryLayer("UserLocationLayer");
                var userFeatures = new List<IFeature> { userFeature };
                
                // Устанавливаем Features или DataSource через рефлексию или dynamic
                try
                {
                    var featuresProperty = typeof(MemoryLayer).GetProperty("Features");
                    if (featuresProperty != null && featuresProperty.CanWrite)
                    {
                        featuresProperty.SetValue(userLayer, userFeatures);
                    }
                    else
                    {
                        var userProvider = new MemoryProvider(userFeatures);
                        var dataSourceProperty = typeof(MemoryLayer).GetProperty("DataSource", 
                            BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Public);
                        if (dataSourceProperty != null)
                        {
                            dataSourceProperty.SetValue(userLayer, userProvider);
                        }
                        else
                        {
                            dynamic dynamicLayer = userLayer;
                            dynamicLayer.DataSource = userProvider;
                        }
                    }
                }
                catch
                {
                    try
                    {
                        var userProvider = new MemoryProvider(userFeatures);
                        dynamic dynamicLayer = userLayer;
                        dynamicLayer.DataSource = userProvider;
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Could not set Features/DataSource on UserLocationLayer");
                    }
                }

                MapView.Map.Layers.Add(userLayer);
                _logger?.LogInformation("User location marker added to map");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error adding user location marker: {Message}", ex.Message);
            }
        }

        private async Task ShowRouteToPartner(Location userLocation, PartnerLocationDto partnerLocation)
        {
            try
            {
                if (MapView?.Map == null) return;

                // Удаляем старый маршрут, если есть
                var existingRouteLayer = MapView.Map.Layers.FirstOrDefault(l => l.Name == "RouteLayer");
                if (existingRouteLayer != null)
                {
                    MapView.Map.Layers.Remove(existingRouteLayer);
                }

                // Создаём прямую линию от пользователя до партнёра
                // (В реальном приложении можно использовать API маршрутизации, например OSRM)
                double userLon = userLocation.Longitude;
                double userLat = userLocation.Latitude;
                double partnerLon = partnerLocation.Longitude!.Value;
                double partnerLat = partnerLocation.Latitude!.Value;

                Mapsui.MPoint userPoint = new Mapsui.MPoint(userLon, userLat);
                Mapsui.MPoint partnerPoint = new Mapsui.MPoint(partnerLon, partnerLat);

                (double x1, double y1) userMercator = SphericalMercator.FromLonLat(userPoint.X, userPoint.Y);
                (double x2, double y2) partnerMercator = SphericalMercator.FromLonLat(partnerPoint.X, partnerPoint.Y);

                Mapsui.MPoint userMercatorPoint = new Mapsui.MPoint(userMercator.x1, userMercator.y1);
                Mapsui.MPoint partnerMercatorPoint = new Mapsui.MPoint(partnerMercator.x2, partnerMercator.y2);

                // В Mapsui 4.x пространство имен Geometries было удалено
                // Используем упрощённый подход - создаём визуальную линию через несколько промежуточных точек
                var routeCoordinates = new List<Mapsui.MPoint> { userMercatorPoint, partnerMercatorPoint };
                
                // Создаём промежуточные точки для визуализации линии
                // Генерируем несколько точек между началом и концом маршрута
                var linePoints = new List<Mapsui.MPoint>();
                int segments = 20; // Количество сегментов для плавной линии
                for (int i = 0; i <= segments; i++)
                {
                    double t = (double)i / segments;
                    double x = userMercatorPoint.X + (partnerMercatorPoint.X - userMercatorPoint.X) * t;
                    double y = userMercatorPoint.Y + (partnerMercatorPoint.Y - userMercatorPoint.Y) * t;
                    linePoints.Add(new Mapsui.MPoint(x, y));
                }
                
                // Создаём Features для каждой точки линии
                var routeFeatures = new List<IFeature>();
                foreach (var point in linePoints)
                {
                    var pointFeature = new PointFeature(point);
                    pointFeature["Type"] = "RoutePoint";
                    
                    // Стиль точки линии (синий цвет, маленький размер)
                    Mapsui.Styles.Color routeColor = new Mapsui.Styles.Color(0, 122, 255);
                    Mapsui.Styles.Brush fillBrush = new Mapsui.Styles.Brush(routeColor);
                    
                    pointFeature.Styles.Add(new SymbolStyle
                    {
                        SymbolType = SymbolType.Ellipse,
                        Fill = fillBrush,
                        SymbolScale = 0.3f, // Маленький размер для создания эффекта линии
                        Opacity = 0.8f
                    });
                    
                    routeFeatures.Add(pointFeature);
                }

                var routeLayer = new MemoryLayer("RouteLayer");
                
                // Устанавливаем Features или DataSource через рефлексию или dynamic
                try
                {
                    var featuresProperty = typeof(MemoryLayer).GetProperty("Features");
                    if (featuresProperty != null && featuresProperty.CanWrite)
                    {
                        featuresProperty.SetValue(routeLayer, routeFeatures);
                    }
                    else
                    {
                        var routeProvider = new MemoryProvider(routeFeatures);
                        var dataSourceProperty = typeof(MemoryLayer).GetProperty("DataSource", 
                            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
                        if (dataSourceProperty != null)
                        {
                            dataSourceProperty.SetValue(routeLayer, routeProvider);
                        }
                        else
                        {
                            dynamic dynamicLayer = routeLayer;
                            dynamicLayer.DataSource = routeProvider;
                        }
                    }
                }
                catch
                {
                    try
                    {
                        var routeProvider = new MemoryProvider(routeFeatures);
                        dynamic dynamicLayer = routeLayer;
                        dynamicLayer.DataSource = routeProvider;
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Could not set Features/DataSource on RouteLayer");
                    }
                }

                MapView.Map.Layers.Add(routeLayer);

                // Центрируем карту так, чтобы были видны и пользователь, и партнёр
                double centerLon = (userLon + partnerLon) / 2;
                double centerLat = (userLat + partnerLat) / 2;
                Mapsui.MPoint centerPoint = new Mapsui.MPoint(centerLon, centerLat);
                (double x, double y) centerMercator = SphericalMercator.FromLonLat(centerPoint.X, centerPoint.Y);
                Mapsui.MPoint centerMercatorPoint = new Mapsui.MPoint(centerMercator.x, centerMercator.y);

                // Вычисляем подходящий zoom level для показа обоих точек
                double latDiff = Math.Abs(userLat - partnerLat);
                double lonDiff = Math.Abs(userLon - partnerLon);
                double maxDiff = Math.Max(latDiff, lonDiff);
                
                // Адаптируем resolution в зависимости от расстояния
                double resolution = maxDiff > 0.01 ? 76.4 : (maxDiff > 0.005 ? 38.2 : 19.1);
                
                MapView.Map.Navigator.CenterOnAndZoomTo(centerMercatorPoint, resolution);

                _logger?.LogInformation($"Route displayed from user ({userLat}, {userLon}) to partner ({partnerLat}, {partnerLon})");

                // Показываем сообщение пользователю
                await DisplayAlert("Маршрут проложен", 
                    $"Прямая линия от вашего местоположения до {partnerLocation.PartnerName}", 
                    "OK");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error showing route: {Message}", ex.Message);
                await DisplayAlert("Ошибка", "Не удалось проложить маршрут", "OK");
            }
        }

        private void OnSearchTextChanged(object? sender, TextChangedEventArgs e)
        {
            var searchText = e.NewTextValue;
            
            // Показываем/скрываем кнопку очистки
            ClearSearchButton.IsVisible = !string.IsNullOrWhiteSpace(searchText);

            // Debounce поиска (500ms)
            _searchDebounceTimer?.Dispose();
            _searchDebounceTimer = new System.Threading.Timer(async _ =>
            {
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    _searchQuery = searchText;
                    await LoadPartnersOnMap();
                });
            }, null, 500, Timeout.Infinite);
        }

        private async void OnSearchCompleted(object? sender, EventArgs e)
        {
            _searchQuery = SearchEntry.Text;
            await LoadPartnersOnMap();
        }

        private async void OnClearSearchClicked(object? sender, EventArgs e)
        {
            SearchEntry.Text = string.Empty;
            _searchQuery = null;
            ClearSearchButton.IsVisible = false;
            await LoadPartnersOnMap();
        }

        private async void OnBackTapped(object? sender, EventArgs e)
        {
            try
            {
                await Shell.Current.GoToAsync("///main/partner");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error navigating back: {Message}", ex.Message);
            }
        }

        private void ShowLoading(bool show)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                LoadingIndicator.IsRunning = show;
                LoadingIndicator.IsVisible = show;
            });
        }

        private async Task<SymbolStyle> CreatePartnerMarkerStyleAsync(string? logoUrl)
        {
            // Создаём маркер в стиле Яндекс.Карт: круглый, с тенью, с логотипом внутри
            const int markerSize = 64; // Размер маркера в пикселях
            const int logoSize = 48; // Размер логотипа внутри маркера
            const int borderWidth = 3; // Толщина белой обводки
            
            try
            {
                // Загружаем логотип, если есть
                SKBitmap? logoBitmap = null;
                if (!string.IsNullOrWhiteSpace(logoUrl) && _imageCacheService != null)
                {
                    logoBitmap = await _imageCacheService.LoadImageAsync(logoUrl);
                }

                // Создаём комбинированное изображение маркера
                using var surface = SKSurface.Create(new SKImageInfo(markerSize, markerSize));
                var canvas = surface.Canvas;
                canvas.Clear(SKColors.Transparent);

                // Рисуем круглый фон с тенью (имитация тени через градиент)
                var centerX = markerSize / 2f;
                var centerY = markerSize / 2f;
                var radius = (markerSize - borderWidth * 2) / 2f;

                // Тень (слегка смещённый серый круг)
                using (var shadowPaint = new SKPaint
                {
                    Color = new SKColor(0, 0, 0, 60), // Полупрозрачный чёрный
                    IsAntialias = true,
                    Style = SKPaintStyle.Fill
                })
                {
                    canvas.DrawCircle(centerX + 2, centerY + 2, radius + borderWidth, shadowPaint);
                }

                // Основной круг (зелёный фон)
                using (var backgroundPaint = new SKPaint
                {
                    Color = new SKColor(15, 107, 83), // #0F6B53
                    IsAntialias = true,
                    Style = SKPaintStyle.Fill
                })
                {
                    canvas.DrawCircle(centerX, centerY, radius, backgroundPaint);
                }

                // Белая обводка
                using (var borderPaint = new SKPaint
                {
                    Color = SKColors.White,
                    IsAntialias = true,
                    Style = SKPaintStyle.Stroke,
                    StrokeWidth = borderWidth
                })
                {
                    canvas.DrawCircle(centerX, centerY, radius, borderPaint);
                }

                // Вставляем логотип в центр, если он загружен
                if (logoBitmap != null && !logoBitmap.IsNull)
                {
                    // Масштабируем логотип до нужного размера
                    var logoRect = new SKRect(
                        centerX - logoSize / 2f,
                        centerY - logoSize / 2f,
                        centerX + logoSize / 2f,
                        centerY + logoSize / 2f
                    );

                    // Рисуем логотип с закруглёнными углами (опционально)
                    canvas.DrawBitmap(logoBitmap, logoRect);
                }
                else
                {
                    // Если логотипа нет, рисуем иконку "магазин" или просто оставляем пустым
                    // Можно добавить дефолтную иконку
                }

                // Получаем финальный битмап (копируем, чтобы не освобождать)
                using var image = surface.Snapshot();
                var finalBitmap = SKBitmap.FromImage(image);
                if (finalBitmap == null)
                {
                    throw new InvalidOperationException("Failed to create bitmap from surface");
                }

                // Регистрируем битмап в Mapsui (битмап будет сохранён в хранилище)
                // В Mapsui 4.x SymbolType.Bitmap не поддерживается напрямую
                // Используем fallback на Ellipse с сохранением битмапа для возможного будущего использования
                var bitmapId = RegisterBitmap(finalBitmap, logoUrl ?? "default_marker");

                // В Mapsui 4.x для использования битмапов нужно использовать правильный API
                // SymbolType.Bitmap не существует в Mapsui 4.x, поэтому используем fallback
                // Fallback на простой маркер, но с улучшенным дизайном
                Mapsui.Styles.Color fillColor = new Mapsui.Styles.Color(15, 107, 83);
                Mapsui.Styles.Color whiteColor = new Mapsui.Styles.Color(255, 255, 255);
                Mapsui.Styles.Brush fillBrush = new Mapsui.Styles.Brush(fillColor);
                Mapsui.Styles.Pen outlinePen = new Mapsui.Styles.Pen(whiteColor, 3);
                
                return new SymbolStyle
                {
                    SymbolType = SymbolType.Ellipse,
                    Fill = fillBrush,
                    Outline = outlinePen,
                    SymbolScale = 1.8f, // Увеличиваем размер для лучшей видимости
                    Opacity = 0.95f
                };
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error creating marker style for logo: {logoUrl}");
                
                // Fallback: простой круглый маркер без логотипа
                Mapsui.Styles.Color fillColor = new Mapsui.Styles.Color(15, 107, 83);
                Mapsui.Styles.Color whiteColor = new Mapsui.Styles.Color(255, 255, 255);
                Mapsui.Styles.Brush fillBrush = new Mapsui.Styles.Brush(fillColor);
                Mapsui.Styles.Pen outlinePen = new Mapsui.Styles.Pen(whiteColor, 3);
                
                return new SymbolStyle
                {
                    SymbolType = SymbolType.Ellipse,
                    Fill = fillBrush,
                    Outline = outlinePen,
                    SymbolScale = 1.5f,
                    Opacity = 0.95f
                };
            }
        }

        private int RegisterBitmap(SKBitmap bitmap, string cacheKey)
        {
            // Используем кэш для избежания дублирования
            if (_bitmapCache.TryGetValue(cacheKey, out var existingId))
            {
                return existingId;
            }

            try
            {
                // Генерируем уникальный ID для битмапа
                var bitmapId = cacheKey.GetHashCode();
                
                // Если ID уже используется, добавляем суффикс
                int suffix = 0;
                while (_bitmapStorage.ContainsKey(bitmapId))
                {
                    bitmapId = (cacheKey + suffix).GetHashCode();
                    suffix++;
                }

                // Сохраняем битмап в хранилище (НЕ освобождаем его!)
                _bitmapStorage[bitmapId] = bitmap;
                _bitmapCache[cacheKey] = bitmapId;
                
                _logger?.LogDebug($"Registered bitmap for marker: {cacheKey}, ID: {bitmapId}, Size: {bitmap.Width}x{bitmap.Height}");
                
                // В Mapsui 4.x битмапы регистрируются автоматически при использовании в SymbolStyle
                // BitmapId используется для идентификации битмапа в рендерере
                return bitmapId;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error registering bitmap: {cacheKey}");
                // Fallback: используем хэш как ID
                var fallbackId = cacheKey.GetHashCode();
                _bitmapCache[cacheKey] = fallbackId;
                if (!_bitmapStorage.ContainsKey(fallbackId))
                {
                    _bitmapStorage[fallbackId] = bitmap;
                }
                return fallbackId;
            }
        }

        private void ShowError(string message)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await DisplayAlert("Ошибка", message, "OK");
            });
        }
    }

    public class CategoryFilter
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public bool IsSelected { get; set; }
    }

    public class PartnerLocationDto
    {
        public int Id { get; set; }
        public int PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? PhoneNumber { get; set; }
        public string? WorkingHours { get; set; }
        public double MaxDiscountPercent { get; set; }
        public string? LogoUrl { get; set; }
    }
}
