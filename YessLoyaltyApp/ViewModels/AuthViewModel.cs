using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using YessLoyaltyApp.Services;
using YessLoyaltyApp.Views;

namespace YessLoyaltyApp.ViewModels
{
    public class LoginViewModel : INotifyPropertyChanged
    {
        private readonly INavigationService _navigationService;
        private readonly ApiService _apiService;
        private string _email;
        private string _password;
        private bool _isLoading;
        private string _errorMessage;
        private readonly ExternalAuthService _externalAuthService;

        public string Email 
        { 
            get => _email; 
            set 
            {
                _email = value;
                OnPropertyChanged();
                ValidateEmail();
            }
        }

        public string Password 
        { 
            get => _password; 
            set 
            {
                _password = value;
                OnPropertyChanged();
                ValidatePassword();
            }
        }

        public bool IsLoading 
        { 
            get => _isLoading; 
            private set 
            {
                _isLoading = value;
                OnPropertyChanged();
                LoginCommand.CanExecute(null);
            }
        }

        public string ErrorMessage 
        { 
            get => _errorMessage; 
            private set 
            {
                _errorMessage = value;
                OnPropertyChanged();
            }
        }

        public bool IsLoginEnabled => 
            !string.IsNullOrWhiteSpace(Email) && 
            !string.IsNullOrWhiteSpace(Password) && 
            !IsLoading;

        public ICommand LoginCommand { get; }
        public ICommand GoogleLoginCommand { get; }
        public ICommand AppleLoginCommand { get; }
        public ICommand NavigateToRegisterCommand { get; }

        public LoginViewModel(
            INavigationService navigationService, 
            ApiService apiService,
            ExternalAuthService externalAuthService)
        {
            _navigationService = navigationService;
            _apiService = apiService;
            _externalAuthService = externalAuthService;

            LoginCommand = new Command(async () => await LoginAsync(), 
                () => IsLoginEnabled);
            GoogleLoginCommand = new Command(async () => await GoogleLoginAsync());
            AppleLoginCommand = new Command(async () => await AppleLoginAsync());
            NavigateToRegisterCommand = new Command(async () => 
                await _navigationService.NavigateToAsync<RegisterPage>());
        }

        private bool ValidateEmail()
        {
            bool isValid = !string.IsNullOrWhiteSpace(Email) && 
                           Email.Contains("@") && 
                           Email.Contains(".");
            return isValid;
        }

        private bool ValidatePassword()
        {
            return !string.IsNullOrWhiteSpace(Password) && 
                   Password.Length >= 6;
        }

        private async Task LoginAsync()
        {
            if (!ValidateEmail() || !ValidatePassword())
            {
                ErrorMessage = "Пожалуйста, введите корректный email и пароль";
                return;
            }

            try 
            {
                IsLoading = true;
                ErrorMessage = string.Empty;

                var response = await _apiService.LoginAsync(Email, Password);
                
                if (response.IsSuccess)
                {
                    // Сохраняем токен
                    _apiService.SetAuthToken(response.Data.AccessToken);

                    // Переход на страницу партнеров
                    await _navigationService.NavigateToAsync<PartnersPage>();
                }
                else
                {
                    ErrorMessage = response.ErrorMessage ?? "Ошибка входа";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task GoogleLoginAsync()
        {
            try 
            {
                IsLoading = true;
                ErrorMessage = string.Empty;

                var result = await _externalAuthService.SignInWithGoogleAsync();

                if (result.IsSuccess)
                {
                    await _navigationService.NavigateToAsync<PartnersPage>();
                }
                else
                {
                    ErrorMessage = result.ErrorMessage;
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task AppleLoginAsync()
        {
            try 
            {
                IsLoading = true;
                ErrorMessage = string.Empty;

                var result = await _externalAuthService.SignInWithAppleAsync();

                if (result.IsSuccess)
                {
                    await _navigationService.NavigateToAsync<PartnersPage>();
                }
                else
                {
                    ErrorMessage = result.ErrorMessage;
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
            }
            finally
            {
                IsLoading = false;
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public class RegisterViewModel : INotifyPropertyChanged
    {
        private readonly INavigationService _navigationService;
        private readonly ApiService _apiService;
        private string _firstName;
        private string _lastName;
        private string _email;
        private string _password;
        private bool _isLoading;
        private string _errorMessage;

        public string FirstName 
        { 
            get => _firstName; 
            set 
            {
                _firstName = value;
                OnPropertyChanged();
                ValidateFirstName();
            }
        }

        public string LastName 
        { 
            get => _lastName; 
            set 
            {
                _lastName = value;
                OnPropertyChanged();
                ValidateLastName();
            }
        }

        public string Email 
        { 
            get => _email; 
            set 
            {
                _email = value;
                OnPropertyChanged();
                ValidateEmail();
            }
        }

        public string Password 
        { 
            get => _password; 
            set 
            {
                _password = value;
                OnPropertyChanged();
                ValidatePassword();
            }
        }

        public bool IsLoading 
        { 
            get => _isLoading; 
            private set 
            {
                _isLoading = value;
                OnPropertyChanged();
                RegisterCommand.CanExecute(null);
            }
        }

        public string ErrorMessage 
        { 
            get => _errorMessage; 
            private set 
            {
                _errorMessage = value;
                OnPropertyChanged();
            }
        }

        public bool IsRegisterEnabled => 
            !string.IsNullOrWhiteSpace(FirstName) &&
            !string.IsNullOrWhiteSpace(LastName) &&
            !string.IsNullOrWhiteSpace(Email) && 
            !string.IsNullOrWhiteSpace(Password) && 
            !IsLoading;

        public ICommand RegisterCommand { get; }
        public ICommand GoogleRegisterCommand { get; }
        public ICommand NavigateToLoginCommand { get; }

        public RegisterViewModel(
            INavigationService navigationService, 
            ApiService apiService)
        {
            _navigationService = navigationService;
            _apiService = apiService;

            RegisterCommand = new Command(async () => await RegisterAsync(), 
                () => IsRegisterEnabled);
            GoogleRegisterCommand = new Command(async () => await GoogleRegisterAsync());
            NavigateToLoginCommand = new Command(async () => 
                await _navigationService.NavigateToAsync<LoginPage>());
        }

        private bool ValidateFirstName()
        {
            return !string.IsNullOrWhiteSpace(FirstName);
        }

        private bool ValidateLastName()
        {
            return !string.IsNullOrWhiteSpace(LastName);
        }

        private bool ValidateEmail()
        {
            return !string.IsNullOrWhiteSpace(Email) && 
                   Email.Contains("@") && 
                   Email.Contains(".");
        }

        private bool ValidatePassword()
        {
            return !string.IsNullOrWhiteSpace(Password) && 
                   Password.Length >= 6;
        }

        private async Task RegisterAsync()
        {
            if (!ValidateFirstName() || !ValidateLastName() || 
                !ValidateEmail() || !ValidatePassword())
            {
                ErrorMessage = "Пожалуйста, заполните все поля корректно";
                return;
            }

            try 
            {
                IsLoading = true;
                ErrorMessage = string.Empty;

                var response = await _apiService.RegisterAsync(
                    FirstName, LastName, Email, Password);
                
                if (response.IsSuccess)
                {
                    await Shell.Current.DisplayAlert(
                        "Регистрация", 
                        "Регистрация успешна", 
                        "OK");

                    await _navigationService.NavigateToAsync<LoginPage>();
                }
                else
                {
                    ErrorMessage = response.ErrorMessage ?? "Ошибка регистрации";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task GoogleRegisterAsync()
        {
            try 
            {
                await Shell.Current.DisplayAlert("Google Регистрация", "Функция в разработке", "OK");
            }
            catch (Exception ex)
            {
                await Shell.Current.DisplayAlert("Ошибка", ex.Message, "OK");
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
