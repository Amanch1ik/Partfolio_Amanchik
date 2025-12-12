using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui.Controls;
using YessGoFront.Services;
using YessGoFront.Services.Domain;

namespace YessGoFront.Views
{
    public partial class WalletPage : ContentPage
    {
        public WalletPage()
        {
            InitializeComponent();
            // Привязываем страницу к общему хранилищу баланса
            BindingContext = BalanceStore.Instance;
            
            // Загружаем баланс из БД при инициализации страницы
            _ = LoadBalanceAsync();
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            // Обновляем баланс при каждом появлении страницы
            await LoadBalanceAsync();
        }

        private async Task LoadBalanceAsync()
        {
            try
            {
                var walletService = MauiProgram.Services.GetService<IWalletService>();
                if (walletService != null)
                {
                    var balance = await walletService.GetBalanceAsync();
                    BalanceStore.Instance.Balance = balance;
                    System.Diagnostics.Debug.WriteLine($"[WalletPage] Баланс загружен из БД: {balance}");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WalletPage] Ошибка загрузки баланса: {ex.Message}");
            }
        }

        private async void OnBackClicked(object? sender, EventArgs e)
        {
            System.Diagnostics.Debug.WriteLine("[WalletPage] Кнопка 'Назад' нажата");
            
            try
            {
                // Переходим на главную страницу (home tab)
                System.Diagnostics.Debug.WriteLine("[WalletPage] Переходим на '//main/home'");
                await Shell.Current.GoToAsync("//main/home", animate: true);
                System.Diagnostics.Debug.WriteLine("[WalletPage] Успешно перешли на main/home");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WalletPage] Ошибка при переходе на main/home: {ex.Message}");
                
                // Если не получилось, пробуем альтернативный маршрут
                try
                {
                    System.Diagnostics.Debug.WriteLine("[WalletPage] Пытаемся перейти на '//main'");
                    await Shell.Current.GoToAsync("//main", animate: true);
                    System.Diagnostics.Debug.WriteLine("[WalletPage] Успешно перешли на main");
                }
                catch (Exception ex2)
                {
                    System.Diagnostics.Debug.WriteLine($"[WalletPage] Ошибка при переходе на main: {ex2.Message}");
                    
                    // Последняя попытка - вернуться назад
                    try
                    {
                        System.Diagnostics.Debug.WriteLine("[WalletPage] Пытаемся вернуться назад через '..'");
                        await Shell.Current.GoToAsync("..", animate: true);
                        System.Diagnostics.Debug.WriteLine("[WalletPage] Успешно вернулись назад");
                    }
                    catch (Exception ex3)
                    {
                        System.Diagnostics.Debug.WriteLine($"[WalletPage] Все маршруты не сработали: {ex3.Message}");
                    }
                }
            }
        }

        private void OnOtherCheckedChanged(object? sender, CheckedChangedEventArgs e)
        {
            // Разрешаем ввод «другой суммы», если выбран соответствующий пункт
            if (entryOther != null)
                entryOther.IsEnabled = rbOther?.IsChecked == true;
        }

        private async void OnAboutCoinsClicked(object? sender, EventArgs e)
        {
            await DisplayAlert("Yess!Coin", "Йесскоины — внутренняя валюта, накапливается за покупки у партнёров.", "OK");
        }

        private async void OnTopUpClicked(object? sender, EventArgs e)
        {
            try
            {
                decimal amount = 0;

                if (rbOther?.IsChecked == true)
                {
                    if (string.IsNullOrWhiteSpace(entryOther?.Text) || !decimal.TryParse(entryOther.Text, out amount) || amount <= 0)
                    {
                        await DisplayAlert("Ошибка", "Введите корректную сумму.", "OK");
                        return;
                    }
                }
                else
                {
                    // Считываем Value из отмеченной радиокнопки
                    amount = GetCheckedPresetAmount();
                    if (amount <= 0)
                    {
                        await DisplayAlert("Ошибка", "Выберите сумму пополнения.", "OK");
                        return;
                    }
                }

                // Обновляем общий баланс
                decimal coefficient = 2m;
                BalanceStore.Instance.Balance += amount * coefficient;

                await DisplayAlert("Готово", $"Баланс пополнен на {amount:0.##} KGS.", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Ошибка", ex.Message, "OK");
            }
        }

        private decimal GetCheckedPresetAmount()
        {
            if (rb1000?.IsChecked == true) return 1000m;
            if (rb800?.IsChecked == true) return 800m;
            if (rb600?.IsChecked == true) return 600m;
            if (rb500?.IsChecked == true) return 500m;
            if (rb300?.IsChecked == true) return 300m;
            if (rb100?.IsChecked == true) return 100m;
            return 0m;
        }



    }
}
