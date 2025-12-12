using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Infrastructure.Ui;
using YessGoFront.Models;
using YessGoFront.Services.Domain;

namespace YessGoFront.ViewModels;

public enum TransactionsFilterType
{
    All,
    Income,
    Expense
}

public class TransactionGroup
{
    public string DateTitle { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public ObservableCollection<PurchaseDto> Items { get; } = new();
}

public partial class TransactionsViewModel : ObservableObject
{
    private readonly IWalletService _walletService;

    [ObservableProperty] private bool isBusy;
    [ObservableProperty] private bool isRefreshing;
    [ObservableProperty] private string? errorMessage;
    [ObservableProperty] private bool hasError;
    [ObservableProperty] private TransactionsFilterType currentFilter = TransactionsFilterType.All;
    [ObservableProperty] private bool hasMoreItems = true;

    public ObservableCollection<TransactionGroup> Groups { get; } = new();

    private int _currentPage = 1;
    private const int PageSize = 20;
    private List<PurchaseDto> _allLoadedTransactions = new(); // Храним все загруженные транзакции

    public IAsyncRelayCommand LoadTransactionsCommand { get; }
    public IAsyncRelayCommand LoadMoreCommand { get; }
    public IAsyncRelayCommand RefreshCommand { get; }

    public TransactionsViewModel(IWalletService walletService)
    {
        _walletService = walletService ?? throw new ArgumentNullException(nameof(walletService));

        LoadTransactionsCommand = new AsyncRelayCommand(LoadInitialAsync);
        LoadMoreCommand = new AsyncRelayCommand(LoadMoreAsync, () => HasMoreItems && !IsBusy);
        RefreshCommand = new AsyncRelayCommand(RefreshAsync);
    }

    partial void OnCurrentFilterChanged(TransactionsFilterType value)
    {
        // При изменении фильтра пересобираем группы из уже загруженных данных
        // Не загружаем заново с сервера, просто применяем фильтр к уже загруженным данным
        if (_allLoadedTransactions.Any())
        {
            RebuildGroupsFromLoadedTransactions();
        }
    }

    private async Task LoadInitialAsync()
    {
        if (IsBusy)
            return;

        try
        {
            IsBusy = true;
            HasError = false;
            ErrorMessage = null;

            _currentPage = 1;
            Groups.Clear();
            HasMoreItems = true;

            await LoadPageAsync(_currentPage, reset: true);
        }
        catch (UnauthorizedException ex)
        {
            HasError = true;
            ErrorMessage = ex.Message;
            // При потере авторизации отправляем пользователя на экран логина, не падая
            await AppUiHelper.NavigateToLoginPageAsync();
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

    private async Task LoadMoreAsync()
    {
        if (IsBusy || !HasMoreItems)
            return;

        try
        {
            IsBusy = true;
            _currentPage++;
            await LoadPageAsync(_currentPage, reset: false);
        }
        catch (UnauthorizedException ex)
        {
            HasError = true;
            ErrorMessage = ex.Message;
            HasMoreItems = false;
            await AppUiHelper.NavigateToLoginPageAsync();
        }
        catch (Exception ex)
        {
            HasError = true;
            ErrorMessage = ex.Message;
            HasMoreItems = false;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task RefreshAsync()
    {
        if (IsBusy)
            return;

        try
        {
            IsRefreshing = true;
            _currentPage = 1;
            Groups.Clear();
            HasMoreItems = true;
            await LoadPageAsync(_currentPage, reset: true);
        }
        catch (UnauthorizedException ex)
        {
            HasError = true;
            ErrorMessage = ex.Message;
            await AppUiHelper.NavigateToLoginPageAsync();
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    private async Task LoadPageAsync(int page, bool reset)
    {
        var items = await _walletService.GetTransactionHistoryAsync(page, PageSize, CancellationToken.None);

        // Если нет данных, проверяем, есть ли еще страницы
        if (!items.Any())
        {
            HasMoreItems = false;
            return;
        }

        // Сохраняем все загруженные транзакции
        if (reset)
        {
            _allLoadedTransactions.Clear();
        }
        _allLoadedTransactions.AddRange(items);

        // Если загрузили меньше чем pageSize, значит это последняя страница
        if (items.Count < PageSize)
        {
            HasMoreItems = false;
        }

        // Пересобираем группы из всех загруженных транзакций с учетом текущего фильтра
        RebuildGroupsFromLoadedTransactions();
    }

    private void RebuildGroupsFromLoadedTransactions()
    {
        // Очищаем группы
        Groups.Clear();

        // Фильтруем все загруженные транзакции по текущему фильтру
        var filtered = _allLoadedTransactions
            .Where(FilterByType)
            .OrderByDescending(x => x.CreatedAt)
            .ToList();

        // Группируем по датам
        foreach (var item in filtered)
        {
            var date = item.CreatedAt.Date;
            var group = Groups.FirstOrDefault(g => g.Date == date);
            if (group == null)
            {
                group = new TransactionGroup
                {
                    Date = date,
                    DateTitle = date.ToString("dd.MM.yyyy")
                };
                Groups.Add(group);
            }

            // Проверяем, нет ли уже этой транзакции в группе (избегаем дубликатов)
            if (!group.Items.Any(i => i.Id == item.Id))
            {
                group.Items.Add(item);
            }
        }
    }

    private bool FilterByType(PurchaseDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Type))
            return CurrentFilter == TransactionsFilterType.All;
            
        var typeLower = dto.Type.ToLower();
        
        return CurrentFilter switch
        {
            TransactionsFilterType.All => true,
            TransactionsFilterType.Income => typeLower == "topup" || 
                                             typeLower == "bonus" || 
                                             typeLower == "refund",
            TransactionsFilterType.Expense => typeLower == "discount" || 
                                              typeLower == "payment",
            _ => true
        };
    }
}
