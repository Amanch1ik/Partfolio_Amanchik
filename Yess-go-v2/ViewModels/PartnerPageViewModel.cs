using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Infrastructure.Ui;
using YessGoFront.Models;
using YessGoFront.Services.Domain;

namespace YessGoFront.ViewModels;

public partial class PartnerPageViewModel : ObservableObject
{
    private readonly IPartnersService _service;
    private readonly ILogger<PartnerPageViewModel>? _logger;

    // Используем DTO категорий, чтобы иметь Id
    public ObservableCollection<CategoryDto> Categories { get; } = new();
    public ObservableCollection<PartnerDto> Partners { get; } = new();

    [ObservableProperty] private string? searchText;
    [ObservableProperty] private bool isBusy;
    [ObservableProperty] private string? selectedCategoryTitle;
    [ObservableProperty] private string? errorMessage;
    [ObservableProperty] private int? selectedCategoryId; // новый: выбранная категория (id)

    // Команда для выбора категории (CommandParameter -> categoryId)
    public IAsyncRelayCommand<int?> SelectCategoryCommand { get; }

    // 👉 ЯВНАЯ КОМАНДА (без source generator)
    public IAsyncRelayCommand<string?> LoadByCategoryAsyncCommand { get; }

    public PartnerPageViewModel(IPartnersService service, ILogger<PartnerPageViewModel>? logger = null)
    {
        _service = service ?? throw new ArgumentNullException(nameof(service));
        _logger = logger;

        // инициализируем команды
        LoadByCategoryAsyncCommand = new AsyncRelayCommand<string?>(LoadByCategoryAsync);
        SelectCategoryCommand = new AsyncRelayCommand<int?>(LoadPartnersByCategoryAsync);

        // Стартовые категории (можно заменить загрузкой из API)
        Categories.Add(new CategoryDto { Id = 0, Name = "Все компании", Slug = "all" });
        Categories.Add(new CategoryDto { Id = 1, Name = "Еда и напитки", Slug = "food-drinks" });
        Categories.Add(new CategoryDto { Id = 2, Name = "Одежда и обувь", Slug = "clothing-shoes" });
        Categories.Add(new CategoryDto { Id = 3, Name = "Красота", Slug = "beauty" });
        Categories.Add(new CategoryDto { Id = 4, Name = "Все для дома", Slug = "home" });
        Categories.Add(new CategoryDto { Id = 5, Name = "Продукты", Slug = "groceries" });

        // стартовый запрос — все
        _ = LoadPartnersByCategoryAsync(0);
    }

    [RelayCommand]
    private async Task OpenPartnerAsync(PartnerDto partner)
    {
        if (partner == null)
            return;

        // Если используешь Shell навигацию:
        await Shell.Current.GoToAsync($"///partnerdetails?partnerId={partner.Id}");
    }

    // ❌ БЕЗ [RelayCommand] — метод вызывается из явной команды
    private async Task LoadByCategoryAsync(string? categoryTitle)
    {
        if (string.IsNullOrWhiteSpace(categoryTitle)) return;

        SelectedCategoryTitle = categoryTitle;
        ErrorMessage = null;

        var backendKey = categoryTitle.Trim().ToLowerInvariant();
        if (backendKey == "все для дома") backendKey = "для дома";

        IsBusy = true;
        try
        {
            Partners.Clear();
            var items = await _service.GetPartnersByCategoryAsync(backendKey);
            foreach (var p in items)
                Partners.Add(p);
        }
        catch (NetworkException ex)
        {
            ErrorMessage = "Нет подключения к интернету";
            _logger?.LogError(ex, "Network error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        catch (ApiException ex)
        {
            ErrorMessage = "Не удалось загрузить партнёров";
            _logger?.LogError(ex, "API error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = "Произошла непредвиденная ошибка";
            _logger?.LogError(ex, "Unexpected error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        finally
        {
            IsBusy = false;
        }
    }

    // Новый метод: загрузка партнёров по id категории (вызов из SelectCategoryCommand)
    public async Task LoadPartnersByCategoryAsync(int? categoryId)
    {
        if (categoryId == null)
            return;

        SelectedCategoryId = categoryId;
        SelectedCategoryTitle = Categories.FirstOrDefault(c => c.Id == categoryId)?.Name;
        ErrorMessage = null;

        IsBusy = true;
        try
        {
            Partners.Clear();
            var items = await _service.GetPartnersByCategoryAsync(categoryId.Value);
            foreach (var p in items)
                Partners.Add(p);
        }
        catch (NetworkException ex)
        {
            ErrorMessage = "Нет подключения к интернету";
            _logger?.LogError(ex, "Network error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        catch (ApiException ex)
        {
            ErrorMessage = "Не удалось загрузить партнёров";
            _logger?.LogError(ex, "API error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = "Произошла непредвиденная ошибка";
            _logger?.LogError(ex, "Unexpected error loading partners");
            var page = AppUiHelper.TryGetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert("Ошибка", ErrorMessage, "OK");
            }
        }
        finally
        {
            IsBusy = false;
        }
    }
}
