using YessGoFront.Data.Entities;
using YessGoFront.Models;
using YessGoFront.Services.Api;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Domain-level authentication contract that wraps API calls and local storage helpers.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Phone-based login helper (normalizes +996 numbers automatically).
    /// </summary>
    Task<AuthResponse> LoginWithPhoneAsync(string phone, string password, CancellationToken ct = default);

    /// <summary>
    /// Legacy login flow (kept for compatibility with old pages).
    /// </summary>
    [Obsolete("Use LoginWithPhoneAsync instead")]
    Task<AuthResponse> LoginAsync(string emailOrPhone, string password, CancellationToken ct = default);

    /// <summary>
    /// Requests an SMS verification code for the specified phone number.
    /// </summary>
    Task<Dictionary<string, object>> SendVerificationCodeAsync(string phoneNumber, CancellationToken ct = default);

    /// <summary>
    /// Verifies the code and finalises user registration (creates the account and logs in).
    /// </summary>
    Task<AuthResponse> VerifyCodeAndRegisterAsync(VerifyCodeRequest request, CancellationToken ct = default);

    Task<bool> RefreshTokenAsync(CancellationToken ct = default);
    Task LogoutAsync(CancellationToken ct = default);
    Task<bool> IsAuthenticatedAsync();

    Task<bool> AuthenticateWithBiometricsAsync();
    Task<bool> ValidatePinAsync(string pin);
    Task SavePinAsync(string pin);
    Task<bool> HasPinAsync();

    /// <summary>
    /// Gets the current authenticated user's ID
    /// </summary>
    Task<int?> GetCurrentUserIdAsync();

    /// <summary>
    /// Получить пользователя из локальной SQLite БД
    /// </summary>
    Task<User?> GetLocalUserAsync(CancellationToken ct = default);

    /// <summary>
    /// Автоматический вход, если пользователь есть на сервере (есть токены), но нет в локальной БД
    /// </summary>
    Task<bool> AutoLoginIfNoLocalUserAsync(CancellationToken ct = default);

    /// <summary>
    /// Получить профиль пользователя из API
    /// </summary>
    Task<UserDto?> GetUserProfileAsync(CancellationToken ct = default);
}
