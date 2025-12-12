using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YessBackend.Application.DTOs.Auth;
using YessBackend.Application.DTOs.PartnerAuth;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер аутентификации партнера
/// Соответствует /api/v1/partner/auth из Python API
/// </summary>
[ApiController]
[Route("api/v1/partner/auth")]
[Tags("Partner Authentication")]
public class PartnerAuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PartnerAuthController> _logger;

    public PartnerAuthController(
        IAuthService authService,
        ApplicationDbContext context,
        ILogger<PartnerAuthController> logger)
    {
        _authService = authService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Аутентификация партнера
    /// POST /api/v1/partner/auth/login
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(TokenResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<TokenResponseDto>> PartnerLogin([FromBody] PartnerLoginRequestDto request)
    {
        try
        {
            // Определяем, это телефон или email
            var isEmail = request.Username.Contains("@");
            
            Domain.Entities.User? user;
            if (isEmail)
            {
                user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.Username);
            }
            else
            {
                user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Phone == request.Username);
            }

            if (user == null)
            {
                return Unauthorized(new { error = "Неверный логин или пароль" });
            }

            // Проверяем, является ли пользователь партнером
            var partnerEmployee = await _context.PartnerEmployees
                .FirstOrDefaultAsync(pe => pe.UserId == user.Id);

            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.OwnerId == user.Id || (partnerEmployee != null && p.Id == partnerEmployee.PartnerId));

            if (partner == null)
            {
                return Unauthorized(new { error = "Пользователь не является партнером" });
            }

            // Проверяем пароль
            if (!_authService.VerifyPassword(request.Password, user.PasswordHash ?? string.Empty))
            {
                return Unauthorized(new { error = "Неверный логин или пароль" });
            }

            // Обновляем время последнего входа
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Создаем токены
            var accessToken = _authService.CreateAccessToken(user);
            var refreshToken = _authService.CreateRefreshToken(user);

            // Формат ответа для партнерской панели
            var response = new
            {
                access_token = accessToken,
                refresh_token = refreshToken,
                token_type = "bearer",
                expires_in = 3600, // 1 час
                user_id = user.Id,
                user = new
                {
                    id = user.Id.ToString(),
                    email = user.Email,
                    phone = user.Phone,
                    username = user.FirstName ?? user.Phone,
                    first_name = user.FirstName,
                    last_name = user.LastName,
                    role = "partner"
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка входа партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

