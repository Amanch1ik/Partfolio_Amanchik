using Microsoft.Extensions.Logging;
using Microsoft.Maui.Controls;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Text.Json;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;
using YessGoFront.Models;

namespace YessGoFront.Views
{
    [QueryProperty(nameof(CategorySlug), "categorySlug")]
    [QueryProperty(nameof(CategoryName), "categoryName")]
    [QueryProperty(nameof(SearchQuery), "searchQuery")]
    public partial class PartnersListPage : ContentPage
    {
        private readonly ILogger<PartnersListPage>? _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        public ObservableCollection<PartnerListItem> Partners { get; } = new();
        public ObservableCollection<CategoryItem> Categories { get; } = new();

        private string _categorySlug = string.Empty;
        private string _categoryName = string.Empty;
        private string _searchQuery = string.Empty;
        private List<PartnerDto> _allPartners = new();

        public string CategorySlug { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string SearchQuery { get; set; } = string.Empty;

        public PartnersListPage()
        {
            InitializeComponent();
            _httpClientFactory = MauiProgram.Services.GetRequiredService<IHttpClientFactory>();
            _logger = MauiProgram.Services.GetService<ILogger<PartnersListPage>>();
            BindingContext = this;

            // Добавим дефолтные категории, пока не загрузятся с API
            LoadDefaultCategories();
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            // Получаем параметры навигации через QueryProperty
            _categorySlug = CategorySlug ?? string.Empty;
            _categoryName = CategoryName ?? string.Empty;
            _searchQuery = SearchQuery ?? string.Empty;
            
            // Устанавливаем поисковый запрос, если есть
            if (!string.IsNullOrEmpty(_searchQuery))
            {
                SearchEntry.Text = _searchQuery;
            }

            // Попробуем загрузить категории из API (не критично)
            _ = LoadCategoriesAsync();

            // Загружаем партнёров
            await LoadPartnersAsync();

            // Выделяем выбранную категорию
            UpdateSelectedCategory();
        }

        private void UpdateSelectedCategory()
        {
            // Сбрасываем все выделения
            foreach (var cat in Categories)
            {
                cat.IsSelected = false;
            }

            // Выделяем категорию, если она была передана
            if (!string.IsNullOrEmpty(_categorySlug))
            {
                var selectedCategory = Categories.FirstOrDefault(c => 
                    (c.Slug == _categorySlug) || 
                    (string.IsNullOrEmpty(c.Slug) && _categorySlug == "all"));
                
                if (selectedCategory != null)
                {
                    selectedCategory.IsSelected = true;
                }
            }
            else
            {
                // Если категория не выбрана, выделяем "Все компании"
                var allCategory = Categories.FirstOrDefault(c => c.Slug == "all" || c.Name == "Все компании");
                if (allCategory != null)
                {
                    allCategory.IsSelected = true;
                }
            }
        }

        private async Task LoadCategoriesAsync()
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient("ApiClient");
                var endpoint = ApiEndpoints.PartnersEndpoints.Categories;

                var response = await httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogWarning($"Failed to load categories: {response.StatusCode}");
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                var categories = JsonSerializer.Deserialize<List<CategoryDto>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (categories == null || categories.Count ==0)
                    return;

                Categories.Clear();
                var isAllSelected = string.IsNullOrEmpty(_categorySlug) || _categorySlug == "all";
                Categories.Add(new CategoryItem("Все компании", "all", isAllSelected));
                foreach (var c in categories.OrderBy(c => c.Name))
                {
                    var isSelected = c.Slug?.ToLowerInvariant() == _categorySlug.ToLowerInvariant();
                    Categories.Add(new CategoryItem(c.Name, c.Slug, isSelected));
                }
                
                // Обновляем выделение после загрузки категорий
                UpdateSelectedCategory();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading categories");
            }
        }

        private void LoadDefaultCategories()
        {
            Categories.Clear();
            Categories.Add(new CategoryItem("Все компании", "all", true));

            // Добавленные категории из БД (пользовательские)
            Categories.Add(new CategoryItem("Кофейня", "coffee-shop"));
            Categories.Add(new CategoryItem("Национальная кухня", "national-cuisine"));
            Categories.Add(new CategoryItem("Бар", "bar"));
            Categories.Add(new CategoryItem("Кафе", "cafe"));
            Categories.Add(new CategoryItem("Ресторан", "restaurant"));
            Categories.Add(new CategoryItem("Пивоварня / Паб", "brewery-pub"));
            Categories.Add(new CategoryItem("Ночной клуб", "night-club"));
            Categories.Add(new CategoryItem("Электроника", "electronics"));
            Categories.Add(new CategoryItem("Спорт и отдых", "sport"));
            Categories.Add(new CategoryItem("Всё для дома", "home"));
            Categories.Add(new CategoryItem("Транспорт", "transport"));

            // Существующие/дополнительные категории (если нужны)
            Categories.Add(new CategoryItem("Продукты", "groceries"));
            Categories.Add(new CategoryItem("Детское", "kids"));
            Categories.Add(new CategoryItem("Образование", "education"));
        }

        private async Task LoadPartnersAsync()
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient("ApiClient");
                string endpoint;

                // Если выбрана категория "Все компании" или slug пустой, загружаем всех партнёров
                if (string.IsNullOrEmpty(_categorySlug) || _categorySlug == "all")
                {
                    endpoint = ApiEndpoints.PartnersEndpoints.List;
                }
                else
                {
                    // Пробуем загрузить по slug категории
                    endpoint = ApiEndpoints.PartnersEndpoints.ByCategory(_categorySlug);
                }

                var response = await httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogWarning($"Failed to load partners: {response.StatusCode}");
                    // Если запрос по категории не удался, пробуем загрузить всех партнёров и фильтровать локально
                    if (!string.IsNullOrEmpty(_categorySlug) && _categorySlug != "all")
                    {
                        _logger?.LogInformation("Falling back to loading all partners and filtering locally");
                        endpoint = ApiEndpoints.PartnersEndpoints.List;
                        response = await httpClient.GetAsync(endpoint);
                        if (!response.IsSuccessStatusCode)
                        {
                            ShowError("Не удалось загрузить партнёров");
                            return;
                        }
                    }
                    else
                    {
                        ShowError("Не удалось загрузить партнёров");
                        return;
                    }
                }

                var json = await response.Content.ReadAsStringAsync();
                
                try
                {
                    var options = new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true
                    };
                    _allPartners = JsonSerializer.Deserialize<List<PartnerDto>>(json, options) ?? new List<PartnerDto>();
                }
                catch (InvalidCastException ex)
                {
                    _logger?.LogError(ex, "InvalidCastException при десериализации партнёров. JSON: {Json}", json.Substring(0, Math.Min(500, json.Length)));
                    ShowError("Ошибка при обработке данных партнёров");
                    return;
                }
                catch (JsonException ex)
                {
                    _logger?.LogError(ex, "JsonException при десериализации партнёров. JSON: {Json}", json.Substring(0, Math.Min(500, json.Length)));
                    ShowError("Ошибка формата данных");
                    return;
                }

                // Применяем фильтр поиска и категории
                ApplyFilters();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading partners");
                ShowError("Произошла ошибка при загрузке данных");
            }
        }

        private void ApplyFilters()
        {
            Partners.Clear();

            var filtered = _allPartners.AsEnumerable();

            // Фильтр по категории (если загрузили всех партнёров, но выбрана категория)
            if (!string.IsNullOrEmpty(_categorySlug) && _categorySlug != "all")
            {
                var categoryLower = _categoryName.ToLowerInvariant();
                filtered = filtered.Where(p =>
                {
                    // Проверяем по названию категории
                    var partnerCategory = p.Categories?.FirstOrDefault()?.Name?.ToLowerInvariant() ?? 
                                         p.Category?.ToLowerInvariant() ?? string.Empty;
                    return partnerCategory.Contains(categoryLower) || 
                           partnerCategory == categoryLower ||
                           // Также проверяем по slug, если есть
                           (p.Categories?.Any(c => c.Slug?.ToLowerInvariant() == _categorySlug.ToLowerInvariant()) == true);
                });
            }

            // Фильтр по поисковому запросу
            if (!string.IsNullOrWhiteSpace(_searchQuery))
            {
                var searchLower = _searchQuery.ToLowerInvariant();
                filtered = filtered.Where(p => 
                    (p.Name?.ToLowerInvariant().Contains(searchLower) == true) ||
                    (p.Description?.ToLowerInvariant().Contains(searchLower) == true) ||
                    (p.Category?.ToLowerInvariant().Contains(searchLower) == true)
                );
            }

            // Преобразуем в PartnerListItem
            foreach (var partner in filtered)
            {
                var categoryName = partner.Categories?.FirstOrDefault()?.Name ?? 
                                  partner.Category ?? 
                                  "Без категории";
                
                var cashbackText = partner.CashbackPercent > 0 
                    ? $"до {partner.CashbackPercent:F2}%" 
                    : "—";

                // Используем CoverImageUrl из БД, если нет - используем LogoUrl
                var coverImage = !string.IsNullOrEmpty(partner.CoverImageUrl) 
                    ? partner.CoverImageUrl 
                    : partner.LogoUrl ?? string.Empty;

                Partners.Add(new PartnerListItem
                {
                    Id = partner.Id,
                    Logo = partner.LogoUrl ?? string.Empty,
                    CoverImage = coverImage,
                    Name = partner.Name ?? "Без названия",
                    Category = categoryName,
                    Description = partner.Description ?? string.Empty,
                    CashbackText = cashbackText,
                    HasDescription = !string.IsNullOrEmpty(partner.Description)
                });
            }

            // Отмечаем последний элемент
            if (Partners.Count > 0)
            {
                Partners[Partners.Count - 1].IsLast = true;
            }
        }

        private void ShowError(string message)
        {
            DisplayAlert("Ошибка", message, "ОК");
        }

        private async void OnBackTapped(object? sender, TappedEventArgs e)
        {
            try
            {
                await Shell.Current.GoToAsync(nameof(PartnerPage));
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Navigation error: {ex.Message}");
            }
        }

        private void OnSearchTextChanged(object? sender, TextChangedEventArgs e)
        {
            _searchQuery = e.NewTextValue ?? string.Empty;
            ApplyFilters();
        }

        private async void OnPartnerTapped(object? sender, TappedEventArgs e)
        {
            try
            {
                if (sender == null) return;
                
                object? context = null;
                if (sender is BindableObject bindable)
                {
                    context = bindable.BindingContext;
                }
                
                if (context is PartnerListItem item)
                {
                    // Открываем сразу страницу с продуктами
                    await Shell.Current.GoToAsync($"PartnerDetailViewPage?partnerId={item.Id}");
                }
                else
                {
                    _logger?.LogWarning($"OnPartnerTapped: Invalid BindingContext type: {context?.GetType().Name ?? "null"}");
                }
            }
            catch (InvalidCastException ex)
            {
                _logger?.LogError(ex, "InvalidCastException in OnPartnerTapped");
                Debug.WriteLine($"InvalidCastException: {ex.Message}");
                await DisplayAlert("Ошибка", $"Ошибка приведения типа: {ex.Message}", "ОК");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Navigation error in OnPartnerTapped");
                Debug.WriteLine($"Navigation error: {ex.Message}");
                await DisplayAlert("Ошибка", $"Не удалось открыть партнёра: {ex.Message}", "ОК");
            }
        }

        // Обработчик нажатия по категории в ScrollView
        private async void OnCategoryTapped(object? sender, TappedEventArgs e)
        {
            try
            {
                if (sender == null) return;
                
                object? context = null;
                if (sender is BindableObject bindable)
                {
                    context = bindable.BindingContext;
                }
                
                if (context is CategoryItem cat)
                {
                    // Сбрасываем все выделения
                    foreach (var c in Categories)
                        c.IsSelected = false;

                    cat.IsSelected = true;
                    _categorySlug = cat.Slug ?? string.Empty;
                    _categoryName = cat.Name ?? string.Empty;

                    // Перезагружаем партнёров по выбранной категории
                    await LoadPartnersAsync();
                }
                else
                {
                    _logger?.LogWarning($"OnCategoryTapped: Invalid BindingContext type: {context?.GetType().Name ?? "null"}");
                }
            }
            catch (InvalidCastException ex)
            {
                _logger?.LogError(ex, "InvalidCastException in OnCategoryTapped");
                Debug.WriteLine($"InvalidCastException: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Category tap error");
                Debug.WriteLine($"Category tap error: {ex.Message}");
            }
        }

        // модель для строки списка
        public class PartnerListItem
        {
            public int Id { get; set; }
            public string Logo { get; set; } = "";
            public string CoverImage { get; set; } = "";
            public string Name { get; set; } = "";
            public string Category { get; set; } = "";
            public string Description { get; set; } = "";
            public string CashbackText { get; set; } = "";
            public bool HasDescription { get; set; } = false;
            public bool IsLast { get; set; } = false;
        }

        // Внутренний класс для категорий
        public class CategoryItem : System.ComponentModel.INotifyPropertyChanged
        {
            private bool _isSelected;

            public string Name { get; set; }
            public string? Slug { get; set; }
            public bool IsSelected
            {
                get => _isSelected;
                set
                {
                    if (_isSelected == value) return;
                    _isSelected = value;
                    PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(nameof(IsSelected)));
                }
            }

            public CategoryItem(string name, string slug, bool isSelected = false)
            {
                Name = name;
                Slug = slug;
                _isSelected = isSelected;
            }

            public event System.ComponentModel.PropertyChangedEventHandler? PropertyChanged;
        }
    }
}
