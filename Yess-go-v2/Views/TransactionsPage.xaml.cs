using System;
using Microsoft.Maui.Controls;
using Microsoft.Extensions.DependencyInjection;
using YessGoFront.Services.Domain;
using YessGoFront.ViewModels;

namespace YessGoFront.Views
{
    public partial class TransactionsPage : ContentPage
    {
        private TransactionsViewModel? _viewModel;

        public TransactionsPage()
        {
            InitializeComponent();

            var walletService = MauiProgram.Services.GetRequiredService<IWalletService>();
            _viewModel = new TransactionsViewModel(walletService);
            BindingContext = _viewModel;

            // Подписываемся на изменение фильтра для обновления UI кнопок
            _viewModel.PropertyChanged += OnViewModelPropertyChanged;

            // Обновляем кнопки фильтров при инициализации
            UpdateFilterButtons();

            _ = _viewModel.LoadTransactionsCommand.ExecuteAsync(null);
        }

        private void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(TransactionsViewModel.CurrentFilter))
            {
                UpdateFilterButtons();
            }
        }

        private void UpdateFilterButtons()
        {
            if (_viewModel == null) return;

            var activeColor = Color.FromArgb("#0F6B53");
            var inactiveColor = Color.FromArgb("#E5E7EB");
            var activeTextColor = Colors.White;
            var inactiveTextColor = Color.FromArgb("#6B7280");

            AllFilterButton.BackgroundColor = _viewModel.CurrentFilter == TransactionsFilterType.All ? activeColor : inactiveColor;
            AllFilterButton.TextColor = _viewModel.CurrentFilter == TransactionsFilterType.All ? activeTextColor : inactiveTextColor;

            IncomeFilterButton.BackgroundColor = _viewModel.CurrentFilter == TransactionsFilterType.Income ? activeColor : inactiveColor;
            IncomeFilterButton.TextColor = _viewModel.CurrentFilter == TransactionsFilterType.Income ? activeTextColor : inactiveTextColor;

            ExpenseFilterButton.BackgroundColor = _viewModel.CurrentFilter == TransactionsFilterType.Expense ? activeColor : inactiveColor;
            ExpenseFilterButton.TextColor = _viewModel.CurrentFilter == TransactionsFilterType.Expense ? activeTextColor : inactiveTextColor;
        }

        private async void OnBackClicked(object? sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("//main");
        }

        private async void OnBackTapped(object? sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("//main");
        }

        private void OnAllFilterClicked(object? sender, EventArgs e)
        {
            if (_viewModel != null)
            {
                _viewModel.CurrentFilter = TransactionsFilterType.All;
            }
        }

        private void OnIncomeFilterClicked(object? sender, EventArgs e)
        {
            if (_viewModel != null)
            {
                _viewModel.CurrentFilter = TransactionsFilterType.Income;
            }
        }

        private void OnExpenseFilterClicked(object? sender, EventArgs e)
        {
            if (_viewModel != null)
            {
                _viewModel.CurrentFilter = TransactionsFilterType.Expense;
            }
        }

        protected override void OnDisappearing()
        {
            base.OnDisappearing();
            if (_viewModel != null)
            {
                _viewModel.PropertyChanged -= OnViewModelPropertyChanged;
            }
        }

        private async void OnTransactionTapped(object? sender, EventArgs e)
        {
            if (sender is not VisualElement element)
                return;

            if ((element as IGestureRecognizers)?.GestureRecognizers.FirstOrDefault() is TapGestureRecognizer tap && tap.CommandParameter is string id)
            {
                await Shell.Current.GoToAsync($"transactiondetails?id={Uri.EscapeDataString(id)}");
            }
        }
    }
}
