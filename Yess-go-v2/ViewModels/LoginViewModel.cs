using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Services.Domain;
using YessGoFront.Services.Api;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly IAuthService _authService;
    private readonly ILogger<LoginViewModel>? _logger;

    [ObservableProperty] private string phone = string.Empty;
    [ObservableProperty] private string password = string.Empty;
    [ObservableProperty] private bool rememberMe = false;
    [ObservableProperty] private bool isBusy = false;
    [ObservableProperty] private string? errorMessage;
    [ObservableProperty] private bool hasError = false;

    public LoginViewModel(IAuthService authService, ILogger<LoginViewModel>? logger = null)
    {
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger;
    }

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (IsBusy)
            return;

        if (string.IsNullOrWhiteSpace(Phone))
        {
            ShowError("Введите номер телефона");
            return;
        }

        // Phone уже содержит полный номер с +996 от PhoneEntry (FullPhoneNumber)
        // Проверяем валидность: должно быть 9 цифр после +996
        var phoneDigits = new string(Phone.Where(char.IsDigit).ToArray());
        // Убираем префикс 996 если есть (PhoneEntry уже добавил +996)
        if (phoneDigits.StartsWith("996") && phoneDigits.Length > 3)
        {
            phoneDigits = phoneDigits.Substring(3);
        }
        if (phoneDigits.Length != 9)
        {
            ShowError("Введите корректный номер телефона (9 цифр)");
            return;
        }

        // Phone уже содержит +996 от PhoneEntry, используем как есть
        var normalizedPhone = Phone.StartsWith("+996") ? Phone : "+996" + phoneDigits;

        if (string.IsNullOrWhiteSpace(Password))
        {
            ShowError("Введите пароль");
            return;
        }

        try
        {
            IsBusy = true;
            HasError = false;
            ErrorMessage = null;

            _logger?.LogInformation("Attempting login for phone: {Phone}", normalizedPhone);

            var response = await _authService.LoginWithPhoneAsync(normalizedPhone, Password);
            _logger?.LogInformation("Login successful. UserId: {UserId}", response.UserId);

            if (OnLoginSuccess is not null)
                await OnLoginSuccess.Invoke(response);
        }
        catch (NetworkException ex)
        {
            // Показываем более детальное сообщение об ошибке
            var errorMessage = ex.Message.Contains("timeout") 
                ? "Сервер не отвечает. Проверьте подключение к интернету."
                : ex.Message.Contains("cleartext") || ex.Message.Contains("SSL") || ex.Message.Contains("certificate")
                ? "Ошибка подключения к серверу. Проверьте настройки сети."
                : "Ошибка сети. Проверьте интернет-соединение.";
            
            ShowError(errorMessage);
            _logger?.LogError(ex, "Network error during login: {Message}", ex.Message);
            
#if ANDROID
            Android.Util.Log.Error("LoginViewModel", $"Network error: {ex.Message}");
            if (ex.InnerException != null)
            {
                Android.Util.Log.Error("LoginViewModel", $"Inner exception: {ex.InnerException.Message}");
            }
#endif
        }
        catch (UnauthorizedException ex)
        {
            ShowError(ex.Message.Contains("Неверный") || ex.Message.Contains("неверный") 
                ? ex.Message 
                : "Неверный Email/телефон или пароль");
            _logger?.LogWarning(ex, "Unauthorized login attempt");
        }
        catch (BadRequestException ex)
        {
            ShowError(ex.Message);
            _logger?.LogWarning(ex, "Bad request during login");
        }
        catch (ApiException ex)
        {
            ShowError($"Ошибка при входе: {ex.Message}");
            _logger?.LogWarning(ex, "API error during login");
        }
        catch (Exception ex)
        {
            ShowError($"Неизвестная ошибка: {ex.Message}");
            _logger?.LogError(ex, "Unexpected error during login");
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void ShowError(string message)
    {
        ErrorMessage = message;
        HasError = true;
        _logger?.LogWarning("Login error: {Message}", message);
    }

    /// <summary>
    /// Очистить все поля формы логина
    /// </summary>
    public void ClearFields()
    {
        Phone = string.Empty;
        Password = string.Empty;
        RememberMe = false;
        ErrorMessage = null;
        HasError = false;
        IsBusy = false;
        _logger?.LogDebug("Login fields cleared");
    }

    public event Func<AuthResponse, Task>? OnLoginSuccess;

}
