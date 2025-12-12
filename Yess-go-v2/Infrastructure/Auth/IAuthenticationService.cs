namespace YessGoFront.Infrastructure.Auth;

/// <summary>
/// Сервис аутентификации для работы с токенами
/// </summary>
public interface IAuthenticationService
{
    /// <summary>
    /// Получить текущий access token
    /// </summary>
    Task<string?> GetAccessTokenAsync();

    /// <summary>
    /// Получить refresh token
    /// </summary>
    Task<string?> GetRefreshTokenAsync();

    /// <summary>
    /// Сохранить токены
    /// </summary>
    Task SaveTokensAsync(string accessToken, string? refreshToken = null);

    /// <summary>
    /// Обновить токены (refresh)
    /// </summary>
    Task<bool> RefreshTokenAsync();

    /// <summary>
    /// Очистить токены
    /// </summary>
    Task ClearTokensAsync();

    /// <summary>
    /// Проверить, аутентифицирован ли пользователь
    /// </summary>
    Task<bool> IsAuthenticatedAsync();
}

