using CommunityToolkit.Mvvm.Input;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.ApplicationModel;
using System.ComponentModel;
using YessGoFront.Services.Domain;
using YessGoFront.Services;

namespace YessGoFront.Views
{
    public partial class PinLoginPage : ContentPage, INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;
        
        protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
        private readonly IAuthService? _authService;
        private string _currentPin = string.Empty;
        private string _tokenStatus = "normal"; // normal, fresh, expired
        private string _tokenStatusMessage = string.Empty;
        private Color _tokenStatusColor = Colors.Gray;
        private bool _isCreatingPin = false; // true - создание PIN, false - ввод PIN
        private string? _confirmPin = null; // Для подтверждения при создании
        private string _subtitleText = string.Empty;

        // Bindable свойства
        public string TitleText => _isCreatingPin ? "Создайте PIN-код" : "Введите PIN-код";
        
        public string SubtitleText
        {
            get => _subtitleText;
            set
            {
                _subtitleText = value;
                OnPropertyChanged();
            }
        }

        public string PinCode
        {
            get => _currentPin;
            set
            {
                if (_currentPin != value)
                {
                    _currentPin = value ?? string.Empty;
                    UpdatePinIndicators();
                    OnPropertyChanged(nameof(PinCode));
                    OnPropertyChanged(nameof(CanDelete));
                }
            }
        }

        public bool HasError { get; private set; }

        public string TokenStatusMessage
        {
            get => _tokenStatusMessage;
            set
            {
                _tokenStatusMessage = value;
                OnPropertyChanged();
            }
        }

        public Color TokenStatusColor
        {
            get => _tokenStatusColor;
            set
            {
                _tokenStatusColor = value;
                OnPropertyChanged();
            }
        }

        public bool ShowTokenStatus => !string.IsNullOrEmpty(_tokenStatusMessage);
        public string ErrorMessage { get; private set; } = string.Empty;
        public bool IsBusy { get; private set; }
        public bool CanDelete => _currentPin.Length > 0;
        public bool IsVerificationMode
        {
            get => !_isCreatingPin && _confirmPin == null;
        }

        public PinLoginPage()
        {
            InitializeComponent();
            
            // Получаем сервисы из DI
            _authService = MauiProgram.Services?.GetService<IAuthService>();

            // Устанавливаем BindingContext для команд
            BindingContext = this;
            
            // Пытаемся определить режим работы из текущего состояния Shell
            try
            {
                var shell = Shell.Current;
                if (shell?.CurrentState?.Location != null)
                {
                    var location = shell.CurrentState.Location.ToString();
                    if (location.Contains("isCreatingPin=true"))
                    {
                        _isCreatingPin = true;
                        System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Constructor: Setting isCreatingPin=true from location: {location}");
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Constructor: Error checking location: {ex.Message}");
            }
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            
            // Если уже начали процесс создания (есть _confirmPin), не меняем режим
            if (_confirmPin != null)
            {
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Already in creation mode, _confirmPin={_confirmPin}");
                return;
            }
            
            // Обрабатываем параметр из query string
            var shell = Shell.Current;
            bool hasQueryParam = false;
            if (shell?.CurrentState?.Location != null)
            {
                var location = shell.CurrentState.Location.ToString();
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Current location: {location}");
                
                // Проверяем наличие параметров в URL
                hasQueryParam = location.Contains("isCreatingPin=true");
                if (hasQueryParam)
                {
                    _isCreatingPin = true;
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Setting isCreatingPin=true from query param");
                }

                // Проверяем параметр tokenStatus
                if (location.Contains("tokenStatus=fresh"))
                {
                    _tokenStatus = "fresh";
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Token status set to fresh");
                }
            }
            
            // Обновляем IsVerificationMode при изменении режима
            OnPropertyChanged(nameof(IsVerificationMode));
            OnPropertyChanged(nameof(TitleText));

            // Проверяем и отображаем статус токенов
            await UpdateTokenStatusAsync();

            // Дополнительная проверка: если параметра нет, проверяем наличие PIN-кода
            if (!hasQueryParam && _authService != null)
            {
                try
                {
                    var hasPin = await _authService.HasPinAsync();
                    _isCreatingPin = !hasPin;
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Checking PIN existence. hasPin={hasPin}, setting isCreatingPin={_isCreatingPin}");
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] OnAppearing: Error checking PIN: {ex.Message}");
                    // По умолчанию считаем, что это режим создания
                    _isCreatingPin = true;
                }
            }
            
            // Обновляем IsVerificationMode при изменении режима
            OnPropertyChanged(nameof(IsVerificationMode));
            OnPropertyChanged(nameof(TitleText));
            
            // Устанавливаем начальный текст подзаголовка только если еще не начали ввод
            if (string.IsNullOrEmpty(_currentPin))
            {
                SubtitleText = _isCreatingPin 
                    ? "Придумайте 4-значный PIN-код для быстрого входа" 
                    : "Введите 4-значный PIN-код для входа";
            }

            // Если создаем PIN и еще не начали ввод, пробуем сначала биометрию
            if (_isCreatingPin && string.IsNullOrEmpty(_currentPin))
            {
                await TryBiometricFirstAsync();
            }
            // Если в режиме верификации (ввод PIN) и еще не начали ввод, также пробуем биометрию
            else if (!_isCreatingPin && string.IsNullOrEmpty(_currentPin))
            {
                await TryBiometricFirstAsync();
            }
        }

        private async Task UpdateTokenStatusAsync()
        {
            try
            {
                var authService = MauiProgram.Services?.GetService<Infrastructure.Auth.IAuthenticationService>();
                if (authService == null) return;

                var accessToken = await authService.GetAccessTokenAsync();
                var refreshToken = await authService.GetRefreshTokenAsync();

                if (_tokenStatus == "fresh")
                {
                    // Токены помечены как свежие AppShell
                    TokenStatusMessage = "Токены свежие. Подтвердите вход PIN";
                    TokenStatusColor = Color.FromArgb("#4CAF50"); // Зеленый
                    OnPropertyChanged(nameof(ShowTokenStatus));
                }
                else if (!string.IsNullOrWhiteSpace(accessToken))
                {
                    var remainingMinutes = Infrastructure.Auth.JwtHelper.GetTokenRemainingMinutes(accessToken);
                    var isValid = Infrastructure.Auth.JwtHelper.IsTokenValid(accessToken);

                    if (!isValid)
                    {
                        TokenStatusMessage = "Токены истекли. Требуется обновление";
                        TokenStatusColor = Color.FromArgb("#F44336"); // Красный
                    }
                    else if (remainingMinutes < 10)
                    {
                        TokenStatusMessage = $"Токены истекут через {remainingMinutes} мин. Рекомендуется обновить";
                        TokenStatusColor = Color.FromArgb("#FF9800"); // Оранжевый
                    }
                    else
                    {
                        // Токены в норме, не показываем сообщение
                        TokenStatusMessage = string.Empty;
                    }
                    OnPropertyChanged(nameof(ShowTokenStatus));
                }
                else if (!string.IsNullOrWhiteSpace(refreshToken))
                {
                    TokenStatusMessage = "Требуется обновление токенов доступа";
                    TokenStatusColor = Color.FromArgb("#FF9800"); // Оранжевый
                    OnPropertyChanged(nameof(ShowTokenStatus));
                }
                else
                {
                    TokenStatusMessage = "Токены отсутствуют. Требуется авторизация";
                    TokenStatusColor = Color.FromArgb("#F44336"); // Красный
                    OnPropertyChanged(nameof(ShowTokenStatus));
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Error updating token status: {ex.Message}");
            }
        }

        private async Task TryBiometricFirstAsync()
        {
            try
            {
                if (_authService != null)
                {
                    // Запрашиваем разрешения на биометрию (если доступно)
                    var biometricSuccess = await _authService.AuthenticateWithBiometricsAsync();
                    if (biometricSuccess)
                    {
                        // Биометрия успешна - переходим дальше
                        await NavigateToMainAsync();
                    }
                    // Если биометрия недоступна или пользователь отменил - продолжаем с PIN
                }
            }
            catch
            {
                // Игнорируем ошибки биометрии, продолжаем с PIN
            }
        }

        private void UpdatePinIndicators()
        {
            // Получаем индикаторы по имени из XAML
            var indicator1 = this.FindByName<Frame>("PinIndicator1");
            var indicator2 = this.FindByName<Frame>("PinIndicator2");
            var indicator3 = this.FindByName<Frame>("PinIndicator3");
            var indicator4 = this.FindByName<Frame>("PinIndicator4");

            if (indicator1 == null || indicator2 == null || indicator3 == null || indicator4 == null)
                return;

            var indicators = new[] { indicator1, indicator2, indicator3, indicator4 };
            var filledColor = Color.FromArgb("#0B4A3B");
            var emptyColor = Color.FromArgb("#E0EFE9");

            for (int i = 0; i < indicators.Length; i++)
            {
                if (i < _currentPin.Length)
                {
                    indicators[i].BackgroundColor = filledColor;
                }
                else
                {
                    indicators[i].BackgroundColor = emptyColor;
                }
            }

            OnPropertyChanged(nameof(CanDelete));
        }

        [RelayCommand]
        private void Number(string number)
        {
            if (_currentPin.Length >= 4)
                return;

            PinCode = _currentPin + number;
            
            // Автоматическая обработка при вводе 4 цифр
            if (_currentPin.Length == 4)
            {
                _ = ProcessPinAsync();
            }
        }

        [RelayCommand]
        private void Delete()
        {
            if (_currentPin.Length > 0)
            {
                PinCode = _currentPin.Substring(0, _currentPin.Length - 1);
                ClearError();
            }
        }

        private void OnPinCodeChanged(object? sender, TextChangedEventArgs e)
        {
            // Обновляем индикаторы при изменении через скрытое поле
            UpdatePinIndicators();
        }

        private async Task ProcessPinAsync()
        {
            if (_currentPin.Length != 4)
                return;

            System.Diagnostics.Debug.WriteLine($"[PinLoginPage] ProcessPinAsync: START - _isCreatingPin={_isCreatingPin}, _confirmPin={_confirmPin}, _currentPin={_currentPin}");
            
            // ВСЕГДА проверяем наличие PIN-кода в хранилище ПЕРЕД обработкой
            bool hasPinInStorage = false;
            if (_authService != null)
            {
                try
                {
                    hasPinInStorage = await _authService.HasPinAsync();
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] ProcessPinAsync: hasPinInStorage={hasPinInStorage}");
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] ProcessPinAsync: Error checking PIN: {ex.Message}");
                    hasPinInStorage = false; // В случае ошибки считаем, что PIN-кода нет
                }
            }
            
            // Определяем режим работы:
            // 1. Если _confirmPin не null - мы в процессе создания (второй ввод) - ВСЕГДА создание
            // 2. Если PIN-кода нет в хранилище - ВСЕГДА создание
            // 3. Если _isCreatingPin = true - режим создания
            // 4. Иначе - режим проверки
            var isActuallyCreating = _confirmPin != null || !hasPinInStorage || _isCreatingPin;
            
            // Обновляем _isCreatingPin для будущих вызовов
            if (!hasPinInStorage)
            {
                _isCreatingPin = true;
            }
            
            System.Diagnostics.Debug.WriteLine($"[PinLoginPage] ProcessPinAsync: FINAL - isActuallyCreating={isActuallyCreating}, hasPinInStorage={hasPinInStorage}");

            IsBusy = true;
            OnPropertyChanged(nameof(IsBusy));
            ClearError();

            try
            {
                await Task.Delay(300); // Небольшая задержка для UX

                if (isActuallyCreating)
                {
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Processing PIN creation...");
                    await HandlePinCreationAsync();
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Processing PIN verification...");
                    await HandlePinVerificationAsync();
                }
            }
            catch (Exception ex)
            {
                ShowError("Произошла ошибка. Попробуйте снова.");
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Error: {ex.Message}");
            }
            finally
            {
                IsBusy = false;
                OnPropertyChanged(nameof(IsBusy));
            }
        }

        private async Task HandlePinCreationAsync()
        {
            System.Diagnostics.Debug.WriteLine($"[PinLoginPage] HandlePinCreationAsync: _confirmPin={_confirmPin}, _currentPin={_currentPin}");
            
            if (_confirmPin == null)
            {
                // Первый ввод - сохраняем для подтверждения
                _confirmPin = _currentPin;
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] First PIN entered: {_confirmPin}");
                
                // Очищаем поле ввода через свойство, чтобы обновить UI
                PinCode = string.Empty;
                
                // Обновляем текст подзаголовка
                SubtitleText = "Подтвердите PIN-код";
                
                // Очищаем ошибки если были
                ClearError();
            }
            else
            {
                // Второй ввод - проверяем совпадение
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Second PIN entered: {_currentPin}, comparing with: {_confirmPin}");
                
                if (_currentPin == _confirmPin)
                {
                    // PIN совпадает - сохраняем
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] PINs match, saving...");
                    
                    if (_authService != null)
                    {
                        await _authService.SavePinAsync(_currentPin);
                    }
                    else
                    {
                        // Fallback: сохраняем напрямую через SecureStorage
                        await Microsoft.Maui.Storage.SecureStorage.SetAsync("user_pin", _currentPin);
                    }

                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] PIN saved successfully, navigating to main...");
                    
                    // Очищаем состояние
                    _confirmPin = null;
                    PinCode = string.Empty;
                    ClearError();
                    
                    // Сразу переходим в приложение после успешного создания PIN
                    await NavigateToMainAsync();
                }
                else
                {
                    // PIN не совпадает
                    System.Diagnostics.Debug.WriteLine($"[PinLoginPage] PINs don't match! First: {_confirmPin}, Second: {_currentPin}");
                    
                    ShowError("PIN-коды не совпадают. Попробуйте снова.");
                    
                    // Сбрасываем состояние
                    _confirmPin = null;
                    PinCode = string.Empty;
                    
                    // Обновляем текст подзаголовка
                    SubtitleText = "Придумайте 4-значный PIN-код для быстрого входа";
                }
            }
        }

        private async Task HandlePinVerificationAsync()
        {
            bool isValid = false;

            if (_authService != null)
            {
                isValid = await _authService.ValidatePinAsync(_currentPin);
            }
            else
            {
                // Fallback: проверяем напрямую через SecureStorage
                var storedPin = await Microsoft.Maui.Storage.SecureStorage.GetAsync("user_pin");
                isValid = storedPin == _currentPin;
            }

            if (isValid)
            {
                // PIN верный - проверяем наличие токенов
                var authService = MauiProgram.Services?.GetService<Infrastructure.Auth.IAuthenticationService>();
                if (authService != null)
                {
                    var accessToken = await authService.GetAccessTokenAsync();
                    var refreshToken = await authService.GetRefreshTokenAsync();
                    
                    // Если нет ни access token, ни refresh token - нужно перелогиниться
                    if (string.IsNullOrWhiteSpace(accessToken) && string.IsNullOrWhiteSpace(refreshToken))
                    {
                        System.Diagnostics.Debug.WriteLine("[PinLoginPage] No tokens found, redirecting to login");
                        await DisplayAlert(
                            "Требуется повторный вход",
                            "Для продолжения работы необходимо войти заново.",
                            "OK");
                        
                        // Очищаем PIN и токены
                        var pinService = new Services.PinStorageService();
                        await pinService.ClearPinAsync();
                        await authService.ClearTokensAsync();
                        AccountStore.Instance.SignOut();
                        
                        // Переходим на страницу входа
                        await Shell.Current.GoToAsync("///login", animate: true);
                        return;
                    }
                    
                    // Если есть access token, проверяем его валидность
                    bool hasValidAccessToken = false;
                    if (!string.IsNullOrWhiteSpace(accessToken))
                    {
                        hasValidAccessToken = Infrastructure.Auth.JwtHelper.IsTokenValid(accessToken);
                        System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Access token exists, IsValid={hasValidAccessToken}");
                        
                        // Если токен валиден - сразу входим
                        if (hasValidAccessToken)
                        {
                            System.Diagnostics.Debug.WriteLine("[PinLoginPage] Access token is valid, navigating to main");
                            await NavigateToMainAsync();
                            return;
                        }
                        
                        // Если токен истек, пытаемся обновить через refresh token (но не блокируем вход, если не получится)
                        if (!string.IsNullOrWhiteSpace(refreshToken) && _authService != null)
                        {
                            System.Diagnostics.Debug.WriteLine("[PinLoginPage] Access token expired, attempting to refresh");
                            var refreshed = await _authService.RefreshTokenAsync();
                            if (refreshed)
                            {
                                System.Diagnostics.Debug.WriteLine("[PinLoginPage] Token refreshed successfully");
                                await NavigateToMainAsync();
                                return;
                            }
                            else
                            {
                                // Refresh не сработал, но PIN валиден - входим в приложение
                                // Пользователь может перелогиниться позже, если токен действительно не работает
                                System.Diagnostics.Debug.WriteLine("[PinLoginPage] Failed to refresh token, but PIN is valid - continuing to main");
                                // Продолжаем - пользователь может перелогиниться позже, если токен действительно не работает
                            }
                        }
                    }
                    else if (!string.IsNullOrWhiteSpace(refreshToken) && _authService != null)
                    {
                        // Если есть только refresh token (access token отсутствует), пытаемся получить новый access token
                        System.Diagnostics.Debug.WriteLine("[PinLoginPage] Only refresh token found, attempting to refresh access token");
                        var refreshed = await _authService.RefreshTokenAsync();
                        if (!refreshed)
                        {
                            // Если refresh не сработал - требуем перелогиниться
                            System.Diagnostics.Debug.WriteLine("[PinLoginPage] Failed to refresh token, redirecting to login");
                            await DisplayAlert(
                                "Требуется повторный вход",
                                "Не удалось обновить токен доступа. Пожалуйста, войдите заново.",
                                "OK");
                            
                            // Очищаем PIN и токены
                            var pinService = new Services.PinStorageService();
                            await pinService.ClearPinAsync();
                            await authService.ClearTokensAsync();
                            AccountStore.Instance.SignOut();
                            
                            // Переходим на страницу входа
                            await Shell.Current.GoToAsync("///login", animate: true);
                            return;
                        }
                    }
                }
                
                // PIN валиден - переходим в приложение (даже если токен истек, пользователь может перелогиниться позже)
                System.Diagnostics.Debug.WriteLine("[PinLoginPage] PIN valid, navigating to main");
                await NavigateToMainAsync();
            }
            else
            {
                // Неверный PIN
                ShowError("Неверный PIN-код. Попробуйте снова.");
                PinCode = string.Empty;
                
                // Вибрация при ошибке (если доступна)
                try
                {
                    Microsoft.Maui.Devices.HapticFeedback.Default.Perform(Microsoft.Maui.Devices.HapticFeedbackType.Click);
                }
                catch { }
            }
        }

        private async Task NavigateToMainAsync()
        {
            try
            {
                // Переходим на главную страницу
                await Shell.Current.GoToAsync("///main/home", animate: true);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Navigation error: {ex.Message}");
                // Fallback навигация
                await Shell.Current.GoToAsync("//main/home", animate: true);
            }
        }

        private void ShowError(string message)
        {
            ErrorMessage = message;
            HasError = true;
            OnPropertyChanged(nameof(ErrorMessage));
            OnPropertyChanged(nameof(HasError));
        }

        private void ClearError()
        {
            if (HasError)
            {
                HasError = false;
                ErrorMessage = string.Empty;
                OnPropertyChanged(nameof(HasError));
                OnPropertyChanged(nameof(ErrorMessage));
            }
        }

        private async void OnForgotPinClicked(object? sender, EventArgs e)
        {
            try
            {
                // Показываем подтверждение
                var confirmed = await DisplayAlert(
                    "Забыли PIN?",
                    "Вы будете перенаправлены на страницу входа. PIN-код будет удалён.",
                    "Продолжить",
                    "Отмена");

                if (!confirmed)
                    return;

                // Удаляем PIN
                var pinService = new Services.PinStorageService();
                await pinService.ClearPinAsync();
                System.Diagnostics.Debug.WriteLine("[PinLoginPage] PIN cleared after 'Forgot PIN'");

                // Очищаем токен и данные аккаунта
                var authService = MauiProgram.Services?.GetService<Infrastructure.Auth.IAuthenticationService>();
                if (authService != null)
                {
                    await authService.ClearTokensAsync();
                }
                AccountStore.Instance.SignOut();

                // Переходим на страницу входа
                await Shell.Current.GoToAsync("///login", animate: true);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[PinLoginPage] Error in OnForgotPinClicked: {ex.Message}");
                await DisplayAlert("Ошибка", "Не удалось выполнить операцию", "OK");
            }
        }
    }
}
