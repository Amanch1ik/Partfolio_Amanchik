// Services/BalanceStore.cs
using System.ComponentModel;

namespace YessGoFront.Services
{
    /// <summary>
    /// Простой синглтон-хранилище баланса для локальной демонстрации.
    /// </summary>
    public sealed class BalanceStore : INotifyPropertyChanged
    {
        public static BalanceStore Instance { get; } = new();

        private decimal _balance = 0m; // стартовый баланс (загружается из БД)
        public decimal Balance
        {
            get => _balance;
            set
            {
                if (_balance == value) return;
                _balance = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Balance)));
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
    }
}
