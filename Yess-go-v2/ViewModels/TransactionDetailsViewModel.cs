using System;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using YessGoFront.Models;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;

namespace YessGoFront.ViewModels;

public partial class TransactionDetailsViewModel : ObservableObject
{
    private readonly IWalletService _walletService;
    private readonly IPartnersApiService? _partnersApiService;

    [ObservableProperty] private bool isBusy;
    [ObservableProperty] private string? errorMessage;
    [ObservableProperty] private bool hasError;
    [ObservableProperty] private PurchaseDto? transaction;
    [ObservableProperty] private PartnerDetailDto? partner;

    public IAsyncRelayCommand<string> LoadCommand { get; }
    public IAsyncRelayCommand RepeatCommand { get; }

    public TransactionDetailsViewModel(IWalletService walletService, IPartnersApiService? partnersApiService = null)
    {
        _walletService = walletService ?? throw new ArgumentNullException(nameof(walletService));
        _partnersApiService = partnersApiService;

        LoadCommand = new AsyncRelayCommand<string>(LoadAsync);
        RepeatCommand = new AsyncRelayCommand(RepeatAsync, CanRepeat);
    }

    private async Task LoadAsync(string id)
    {
        if (IsBusy)
            return;

        try
        {
            IsBusy = true;
            HasError = false;
            ErrorMessage = null;

            Transaction = await _walletService.GetTransactionByIdAsync(id, CancellationToken.None);

            if (!string.IsNullOrWhiteSpace(Transaction?.PartnerId) && _partnersApiService != null)
            {
                Partner = await _partnersApiService.GetByIdAsync(Transaction.PartnerId);
            }
        }
        catch (Exception ex)
        {
            HasError = true;
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private bool CanRepeat()
    {
        return Transaction != null && string.Equals(Transaction.Status, "completed", StringComparison.OrdinalIgnoreCase);
    }

    private Task RepeatAsync()
    {
        // Реальная логика повторения транзакции будет реализована через соответствующий сервис,
        // когда он появится. Сейчас оставляем метод заглушкой без побочных эффектов.
        return Task.CompletedTask;
    }
}
