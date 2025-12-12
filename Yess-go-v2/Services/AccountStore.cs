// Services/AccountStore.cs
using System.ComponentModel;
using Microsoft.Maui.Storage;

namespace YessGoFront.Services
{
    public sealed class AccountStore : INotifyPropertyChanged
    {
        public static AccountStore Instance { get; } = new();

        // Ключи Preferences
        private const string KeyEmail = "acc_email";
        private const string KeyFirstName = "acc_firstname";
        private const string KeyLastName = "acc_lastname";
        private const string KeyPhone = "acc_phone";
        private const string KeyRemember = "acc_remember";
        private const string KeySignedIn = "acc_signed_in";

        // Бэкинг-поля
        private string? _email, _firstName, _lastName, _phone;
        private bool _rememberMe, _isSignedIn;

        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnChanged(string name) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

        // Свойства (с уведомлением об изменении DisplayName при изменениях основ)
        public string? Email
        {
            get => _email;
            private set
            {
                if (_email == value) return;
                _email = value;
                OnChanged(nameof(Email));
                OnChanged(nameof(DisplayName));
            }
        }

        public string? FirstName
        {
            get => _firstName;
            private set
            {
                if (_firstName == value) return;
                _firstName = value;
                OnChanged(nameof(FirstName));
                OnChanged(nameof(DisplayName));
            }
        }

        public string? LastName
        {
            get => _lastName;
            private set
            {
                if (_lastName == value) return;
                _lastName = value;
                OnChanged(nameof(LastName));
                OnChanged(nameof(DisplayName));
            }
        }

        public string? Phone
        {
            get => _phone;
            private set
            {
                if (_phone == value) return;
                _phone = value;
                OnChanged(nameof(Phone));
            }
        }

        public bool RememberMe
        {
            get => _rememberMe;
            private set
            {
                if (_rememberMe == value) return;
                _rememberMe = value;
                OnChanged(nameof(RememberMe));
            }
        }

        public bool IsSignedIn
        {
            get => _isSignedIn;
            private set
            {
                if (_isSignedIn == value) return;
                _isSignedIn = value;
                OnChanged(nameof(IsSignedIn));
            }
        }

        private AccountStore() => Load();

        // Отображаемое имя для UI
        public string DisplayName
        {
            get
            {
                var fullName = $"{FirstName} {LastName}".Trim();
                if (!string.IsNullOrWhiteSpace(fullName))
                    return fullName;
                
                // Если нет имени, используем телефон или email
                if (!string.IsNullOrWhiteSpace(Phone))
                    return Phone;
                
                if (!string.IsNullOrWhiteSpace(Email))
                    return Email;
                
                return "Гость";
            }
        }

        // ===== Persistence =====
        public void Load()
        {
            Email = Preferences.Get(KeyEmail, null);
            FirstName = Preferences.Get(KeyFirstName, null);
            LastName = Preferences.Get(KeyLastName, null);
            Phone = Preferences.Get(KeyPhone, null);
            RememberMe = Preferences.Get(KeyRemember, false);
            IsSignedIn = Preferences.Get(KeySignedIn, false);

            // Если не просили «запоминать», не поднимем сессию автоматически
            if (!RememberMe) IsSignedIn = false;
        }

        private void Save()
        {
            // Удобный helper: если null — удаляем ключ
            static void SetOrRemove(string key, string? value)
            {
                if (value is null) Preferences.Remove(key);
                else Preferences.Set(key, value);
            }

            SetOrRemove(KeyEmail, Email);
            SetOrRemove(KeyFirstName, FirstName);
            SetOrRemove(KeyLastName, LastName);
            SetOrRemove(KeyPhone, Phone);

            Preferences.Set(KeyRemember, RememberMe);
            Preferences.Set(KeySignedIn, IsSignedIn);
        }

        // ===== Операции =====

        public void SignIn(string email, string? firstName, string? lastName, bool remember, string? phone = null)
        {
            Email = email?.Trim();
            FirstName = firstName?.Trim();
            LastName = lastName?.Trim();
            Phone = phone?.Trim();
            RememberMe = remember;
            IsSignedIn = true;
            Save();
        }

        public void UpdateProfile(string? firstName, string? lastName, string? phone = null)
        {
            FirstName = firstName?.Trim();
            LastName = lastName?.Trim();
            Phone = phone?.Trim();
            Save();
        }

        public void UpdateRemember(bool remember)
        {
            RememberMe = remember;
            Save();
        }

        public void SignOut(bool keepProfile = false)
        {
            IsSignedIn = false;

            if (!keepProfile)
            {
                Email = null;
                FirstName = null;
                LastName = null;
                Phone = null;
                RememberMe = false;
            }

            Save();
        }

        /// <summary>
        /// Попытаться автоматически войти, если RememberMe=true и сохранён SignedIn=true.
        /// </summary>
        public bool TryAutoSignIn()
        {
            Load(); // перечитать Preferences
            return IsSignedIn;
        }

        /// <summary>
        /// Полный сброс всех данных аккаунта.
        /// </summary>
        public void ResetAll()
        {
            Preferences.Remove(KeyEmail);
            Preferences.Remove(KeyFirstName);
            Preferences.Remove(KeyLastName);
            Preferences.Remove(KeyPhone);
            Preferences.Remove(KeyRemember);
            Preferences.Remove(KeySignedIn);

            Email = FirstName = LastName = Phone = null;
            RememberMe = false;
            IsSignedIn = false;
        }
    }
}
