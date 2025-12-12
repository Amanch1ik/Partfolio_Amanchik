using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YessBackend.Application.DTOs.Auth;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер аутентификации администратора
/// Соответствует /api/v1/admin/auth из Python API
/// </summary>
[ApiController]
[Route("api/v1/admin/auth")]
[Tags("Admin Authentication")]
public class AdminAuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminAuthController> _logger;

    public AdminAuthController(
        IAuthService authService,
        ApplicationDbContext context,
        ILogger<AdminAuthController> logger)
    {
        _authService = authService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Аутентификация администратора
    /// POST /api/v1/admin/auth/login
    /// Поддерживает вход по email или phone
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<object>> AdminLogin([FromBody] AdminLoginRequestDto request)
    {
        try
        {
            // Определяем, это email или phone
            var isEmail = request.Username.Contains("@");
            
            Domain.Entities.User? user;
            if (isEmail)
            {
                user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Email == request.Username);
            }
            else
            {
                user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Phone == request.Username);
            }

            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден" });
            }

            // Проверяем пароль
            if (!_authService.VerifyPassword(request.Password, user.PasswordHash ?? string.Empty))
            {
                return Unauthorized(new { error = "Неверный пароль" });
            }

            // Проверяем, что пользователь имеет роль admin или superadmin
            var hasAdminRole = user.UserRoles.Any(ur => 
                ur.Role != null && (ur.Role.Name == "admin" || ur.Role.Name == "superadmin"));

            if (!hasAdminRole)
            {
                return Forbid("Доступ запрещен. Пользователь не является администратором.");
            }

            // Проверяем активность пользователя
            if (!user.IsActive)
            {
                return Forbid("Аккаунт деактивирован");
            }

            // Обновляем время последнего входа
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Создаем токены
            var accessToken = _authService.CreateAccessToken(user);
            var refreshToken = _authService.CreateRefreshToken(user);

            // Формат ответа для админ-панели
            return Ok(new
            {
                access_token = accessToken,
                refresh_token = refreshToken,
                token_type = "bearer",
                expires_in = 3600, // 1 час
                admin = new
                {
                    id = user.Id.ToString(),
                    email = user.Email,
                    phone = user.Phone,
                    username = user.FirstName ?? user.Phone,
                    first_name = user.FirstName,
                    last_name = user.LastName,
                    role = "admin"
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка входа администратора");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

/// <summary>
/// DTO для входа администратора
/// </summary>
public class AdminLoginRequestDto
{
    public string Username { get; set; } = string.Empty; // email или phone
    public string Password { get; set; } = string.Empty;
}

