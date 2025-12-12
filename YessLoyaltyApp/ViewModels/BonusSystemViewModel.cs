using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows.Input;
using YessLoyaltyApp.Models;
using YessLoyaltyApp.Services;

namespace YessLoyaltyApp.ViewModels
{
    public class BonusSystemViewModel : BaseViewModel
    {
        private readonly IApiService _apiService;
        private readonly IMonitoringService _monitoringService;
        private readonly IDialogService _dialogService;

        private decimal _balance;
        private string _loyaltyLevel;
        private double _loyaltyProgress;
        private ObservableCollection<Transaction> _transactions;

        public decimal Balance
        {
            get => _balance;
            set => SetProperty(ref _balance, value);
        }

        public string LoyaltyLevel
        {
            get => _loyaltyLevel;
            set => SetProperty(ref _loyaltyLevel, value);
        }

        public double LoyaltyProgress
        {
            get => _loyaltyProgress;
            set => SetProperty(ref _loyaltyProgress, value);
        }

        public ObservableCollection<Transaction> Transactions
        {
            get => _transactions;
            set => SetProperty(ref _transactions, value);
        }

        public ICommand TopUpCommand { get; }
        public ICommand WithdrawCommand { get; }
        public ICommand RefreshCommand { get; }

        public BonusSystemViewModel(
            IApiService apiService,
            IMonitoringService monitoringService,
            IDialogService dialogService)
        {
            _apiService = apiService;
            _monitoringService = monitoringService;
            _dialogService = dialogService;

            Transactions = new ObservableCollection<Transaction>();

            TopUpCommand = new Command(async () => await TopUpBalanceAsync());
            WithdrawCommand = new Command(async () => await WithdrawBalanceAsync());
            RefreshCommand = new Command(async () => await LoadBonusDataAsync());

            // Автоматическая загрузка при создании
            LoadBonusDataAsync();
        }

        private async Task LoadBonusDataAsync()
        {
            try
            {
                IsLoading = true;

                // Загрузка баланса
                var walletResponse = await _apiService.GetWalletAsync();
                Balance = walletResponse.Balance;

                // Загрузка уровня лояльности
                var loyaltyResponse = await _apiService.GetLoyaltyLevelAsync();
                LoyaltyLevel = loyaltyResponse.CurrentLevel;
                LoyaltyProgress = loyaltyResponse.ProgressToNextLevel;

                // Загрузка транзакций
                var transactionsResponse = await _apiService.GetTransactionsAsync();
                Transactions.Clear();
                foreach (var transaction in transactionsResponse)
                {
                    Transactions.Add(transaction);
                }

                _monitoringService.TrackEvent("BonusDataLoaded", new Dictionary<string, string>
                {
                    { "Balance", Balance.ToString() },
                    { "LoyaltyLevel", LoyaltyLevel },
                    { "TransactionsCount", Transactions.Count.ToString() }
                });
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось загрузить бонусные данные", ex);
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task TopUpBalanceAsync()
        {
            try
            {
                var amount = await _dialogService.DisplayPromptAsync(
                    "Пополнение баланса", 
                    "Введите сумму пополнения (YesCoin)"
                );

                if (decimal.TryParse(amount, out decimal topUpAmount))
                {
                    var response = await _apiService.TopUpBalanceAsync(topUpAmount);
                    
                    if (response.Success)
                    {
                        Balance += topUpAmount;
                        
                        _monitoringService.TrackEvent("BalanceTopUp", new Dictionary<string, string>
                        {
                            { "Amount", topUpAmount.ToString() }
                        });

                        await _dialogService.DisplayAlertAsync(
                            "Успех", 
                            $"Баланс пополнен на {topUpAmount} YesCoin", 
                            "ОК"
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось пополнить баланс", ex);
            }
        }

        private async Task WithdrawBalanceAsync()
        {
            try
            {
                var amount = await _dialogService.DisplayPromptAsync(
                    "Списание баллов", 
                    "Введите сумму списания (YesCoin)"
                );

                if (decimal.TryParse(amount, out decimal withdrawAmount))
                {
                    if (withdrawAmount > Balance)
                    {
                        await _dialogService.DisplayAlertAsync(
                            "Ошибка", 
                            "Недостаточно средств", 
                            "ОК"
                        );
                        return;
                    }

                    var response = await _apiService.WithdrawBalanceAsync(withdrawAmount);
                    
                    if (response.Success)
                    {
                        Balance -= withdrawAmount;
                        
                        _monitoringService.TrackEvent("BalanceWithdraw", new Dictionary<string, string>
                        {
                            { "Amount", withdrawAmount.ToString() }
                        });

                        await _dialogService.DisplayAlertAsync(
                            "Успех", 
                            $"Списано {withdrawAmount} YesCoin", 
                            "ОК"
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось списать баллы", ex);
            }
        }
    }

    public class Transaction
    {
        public string PartnerName { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public bool IsPositive { get; set; }
    }
}
