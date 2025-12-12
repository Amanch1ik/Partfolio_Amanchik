using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Graphics;
using YessGoFront.Services.Domain;

namespace YessGoFront.ViewModels;

public partial class PromocodeViewModel : BaseViewModel
{
    private readonly IPromoCodeService _promoCodeService;
    private readonly ILogger<PromocodeViewModel>? _logger;

    [ObservableProperty]
    private string promoCode = string.Empty;

    [ObservableProperty]
    private string message = string.Empty;

    [ObservableProperty]
    private Color messageColor = Colors.Red;

    [ObservableProperty]
    private bool hasMessage = false;

    [ObservableProperty]
    private bool canApply = false;

    [ObservableProperty]
    private bool isPromoCodeApplied = false;

    [ObservableProperty]
    private string promoCodeInfo = string.Empty;

    [ObservableProperty]
    private bool hasPromoCodeHistory = false;

    public ObservableCollection<PromoCodeHistoryItem> PromoCodeHistory { get; } = new();

    public IAsyncRelayCommand ApplyPromoCodeCommand { get; }
    public IAsyncRelayCommand LoadPromoCodeHistoryCommand { get; }

    public PromocodeViewModel(
        IPromoCodeService promoCodeService,
        ILogger<PromocodeViewModel>? logger = null)
    {
        _promoCodeService = promoCodeService ?? throw new ArgumentNullException(nameof(promoCodeService));
        _logger = logger;
        
        Title = "Промокод";
        
        ApplyPromoCodeCommand = new AsyncRelayCommand(ApplyPromoCodeAsync, () => CanApply);
        LoadPromoCodeHistoryCommand = new AsyncRelayCommand(LoadPromoCodeHistoryAsync);
    }

    partial void OnPromoCodeChanged(string value)
    {
        CanApply = !string.IsNullOrWhiteSpace(value);
        HasMessage = false;
        ApplyPromoCodeCommand.NotifyCanExecuteChanged();
    }

    private async Task ApplyPromoCodeAsync()
    {
        if (string.IsNullOrWhiteSpace(PromoCode))
        {
            ShowMessage("Введите промокод", Colors.Red);
            return;
        }

        try
        {
            _logger?.LogInformation("Applying promo code: {PromoCode}", PromoCode);
            
            var result = await _promoCodeService.ValidatePromoCodeAsync(PromoCode);
            
            if (result.IsValid)
            {
                ShowMessage($"Промокод применен! Скидка: {result.DiscountAmount:F2} сом", Colors.Green);
                IsPromoCodeApplied = true;
                PromoCodeInfo = $"Скидка: {result.DiscountAmount:F2} сом. {result.Message}";
                
                // Очищаем поле после успешного применения
                PromoCode = string.Empty;
                CanApply = false;
                
                // Обновляем историю
                await LoadPromoCodeHistoryAsync();
            }
            else
            {
                ShowMessage(result.Message ?? "Промокод недействителен", Colors.Red);
                IsPromoCodeApplied = false;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error applying promo code");
            ShowMessage($"Ошибка: {ex.Message}", Colors.Red);
            IsPromoCodeApplied = false;
        }
    }

    private async Task LoadPromoCodeHistoryAsync()
    {
        try
        {
            _logger?.LogInformation("Loading promo code history");
            
            var history = await _promoCodeService.GetUserPromoCodesAsync();
            
            PromoCodeHistory.Clear();
            foreach (var item in history)
            {
                PromoCodeHistory.Add(item);
            }
            
            HasPromoCodeHistory = PromoCodeHistory.Count > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading promo code history");
        }
    }

    private void ShowMessage(string text, Color color)
    {
        Message = text;
        MessageColor = color;
        HasMessage = true;
    }
}

public class PromoCodeHistoryItem
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Discount { get; set; }
    public DateTime UsedAt { get; set; }
}

