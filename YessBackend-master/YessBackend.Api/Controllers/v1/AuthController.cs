using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YessBackend.Application.DTOs.Auth;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;
using AutoMapper;
using Microsoft.Extensions.Configuration;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json.Serialization;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер аутентификации
/// Соответствует /api/v1/auth из Python API
/// </summary>
[ApiController]
[Route("api/v1/auth")]
[Tags("Authentication")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService authService,
        ApplicationDbContext context,
        IMapper mapper,
        ILogger<AuthController> logger,
        IConfiguration configuration)
    {
        _authService = authService;
        _context = context;
        _mapper = mapper;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Регистрация нового пользователя
    /// POST /api/v1/auth/register
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserResponseDto>> Register([FromBody] UserRegisterDto registerDto)
    {
        try
        {
            var user = await _authService.RegisterUserAsync(registerDto);
            var response = _mapper.Map<UserResponseDto>(user);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка регистрации пользователя");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Вход пользователя (JSON)
    /// POST /api/v1/auth/login
    /// Поддерживает JSON формат
    /// </summary>
    [HttpPost("login")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(TokenResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] UserLoginDto loginDto)
    {
        try
        {
            var tokenResponse = await _authService.LoginAsync(loginDto);
            return Ok(tokenResponse);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка входа пользователя");
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Вход пользователя (JSON)
    /// POST /api/v1/auth/login/json
    /// Поддерживает JSON формат, вход по email или phone
    /// </summary>
    [HttpPost("login/json")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(TokenResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TokenResponseDto>> LoginJson([FromBody] UserLoginDto loginDto)
    {
        try
        {
            // Поддержка входа по email или phone
            // Если поле Phone содержит @, это email
            var isEmail = loginDto.Phone.Contains("@");
            
            Domain.Entities.User? user;
            if (isEmail)
            {
                // Ищем по email
                user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == loginDto.Phone);
            }
            else
            {
                // Ищем по phone (стандартное поведение)
                user = await _authService.GetUserByPhoneAsync(loginDto.Phone);
            }

            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден" });
            }

            if (!_authService.VerifyPassword(loginDto.Password, user.PasswordHash ?? string.Empty))
            {
                return Unauthorized(new { error = "Неверный пароль" });
            }

            // Обновляем время последнего входа
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var accessToken = _authService.CreateAccessToken(user);
            var refreshToken = _authService.CreateRefreshToken(user);
            
            var expiresIn = _configuration.GetValue<int>("Jwt:AccessTokenExpireMinutes", 60);

            var tokenResponse = new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenType = "bearer",
                ExpiresIn = expiresIn * 60
            };

            // Добавляем информацию о пользователе для совместимости с админ-панелью
            return Ok(new
            {
                access_token = tokenResponse.AccessToken,
                refresh_token = tokenResponse.RefreshToken,
                token_type = tokenResponse.TokenType,
                expires_in = tokenResponse.ExpiresIn,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    phone = user.Phone,
                    first_name = user.FirstName,
                    last_name = user.LastName
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка входа пользователя");
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Обновление access/refresh токенов по refresh токену
    /// POST /api/v1/auth/refresh
    /// </summary>
    [HttpPost("refresh")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(TokenResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TokenResponseDto>> Refresh([FromBody] RefreshTokenRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { error = "refresh_token is required" });
        }

        try
        {
            var jwtSection = _configuration.GetSection("Jwt");
            var secretKey = jwtSection["SecretKey"];
            if (string.IsNullOrEmpty(secretKey))
            {
                throw new InvalidOperationException("JWT SecretKey не настроен");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtSection["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSection["Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(request.RefreshToken, validationParameters, out var _);

            var typeClaim = principal.FindFirst("type")?.Value;
            if (!string.Equals(typeClaim, "refresh", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new { error = "Invalid token type" });
            }

            var phone = principal.FindFirst("phone")?.Value ?? principal.Identity?.Name;
            if (string.IsNullOrEmpty(phone))
            {
                return Unauthorized(new { error = "Invalid refresh token" });
            }

            var user = await _authService.GetUserByPhoneAsync(phone);
            if (user == null || !user.IsActive || user.IsBlocked)
            {
                return Unauthorized(new { error = "Пользователь не найден или заблокирован" });
            }

            var accessToken = _authService.CreateAccessToken(user);
            var refreshToken = _authService.CreateRefreshToken(user);
            var expiresMinutes = jwtSection.GetValue<int>("AccessTokenExpireMinutes", 60);

            var response = new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenType = "bearer",
                ExpiresIn = expiresMinutes * 60
            };

            return Ok(response);
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Неверный refresh токен");
            return Unauthorized(new { error = "Неверный refresh токен" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при обновлении токена");
            return StatusCode(500, new { error = "Ошибка сервера при обновлении токена" });
        }
    }

    /// <summary>
    /// Получить информацию о текущем пользователе
    /// GET /api/v1/auth/me
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponseDto>> GetMe()
    {
        try
        {
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var user = await _authService.GetUserByIdAsync(int.Parse(userId));
            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден" });
            }

            var response = _mapper.Map<UserResponseDto>(user);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения информации о пользователе");
            return Unauthorized(new { error = "Ошибка аутентификации" });
        }
    }

    /// <summary>
    /// Отправка SMS кода
    /// POST /api/v1/auth/send-verification-code
    /// POST /api/v1/auth/send-code (алиас для совместимости)
    /// </summary>
    [HttpPost("send-verification-code")]
    [HttpPost("send-code")] // Алиас для совместимости с некоторыми клиентами
    [Consumes("application/json")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> SendVerificationCode([FromBody] SendVerificationCodeRequestDto request)
    {
        _logger.LogInformation("📱 [AUTH] Получен запрос на отправку кода верификации для номера: {Phone}", request?.PhoneNumber);

        if (string.IsNullOrWhiteSpace(request?.PhoneNumber))
        {
            _logger.LogWarning("❌ [AUTH] Запрос без номера телефона");
            return BadRequest(new { error = "phone_number is required" });
        }

        try
        {
            _logger.LogInformation("✅ [AUTH] Вызов SendVerificationCodeAsync для номера: {Phone}", request.PhoneNumber);
            var code = await _authService.SendVerificationCodeAsync(request.PhoneNumber);
            
            _logger.LogInformation("✅ [AUTH] Код верификации успешно сохранен в БД для номера {Phone}. Код: {Code}", request.PhoneNumber, code);

            // В development режиме возвращаем код для тестирования
            // В production кода не должно быть в ответе
            var isDevelopment = _configuration.GetValue<bool>("DevelopmentMode", true);
            
            var response = new
            {
                phone_number = request.PhoneNumber,
                message = "Код отправлен",
                success = true
            };

            if (isDevelopment)
            {
                // Добавляем код только в development режиме
                var devResponse = new
                {
                    phone_number = request.PhoneNumber,
                    code,
                    verification_code = code, // Дополнительное поле для совместимости
                    message = "Код отправлен (development mode)",
                    success = true
                };
                _logger.LogInformation("✅ [AUTH] Возвращаем код в ответе (development mode): {Code}", code);
                return Ok(devResponse);
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "❌ [AUTH] Ошибка отправки кода верификации: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [AUTH] Внутренняя ошибка при отправке кода верификации");
            return StatusCode(500, new { error = "Ошибка отправки кода" });
        }
    }

    /// <summary>
    /// Проверка кода верификации и регистрация пользователя
    /// POST /api/v1/auth/verify-code
    /// </summary>
    [HttpPost("verify-code")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserResponseDto>> VerifyCodeAndRegister([FromBody] VerifyCodeAndRegisterRequestDto request)
    {
        _logger.LogInformation("🔐 [AUTH] Получен запрос на проверку кода и регистрацию для номера: {Phone}, код: {Code}", 
            request?.PhoneNumber, request?.Code);

        try
        {
            var user = await _authService.VerifyCodeAndRegisterAsync(request);
            var response = _mapper.Map<UserResponseDto>(user);
            _logger.LogInformation("✅ [AUTH] Регистрация успешна для номера: {Phone}, UserId: {UserId}", 
                request?.PhoneNumber, user.Id);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "❌ [AUTH] Ошибка проверки кода и регистрации для номера {Phone}: {Message}", 
                request?.PhoneNumber, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [AUTH] Внутренняя ошибка при регистрации для номера {Phone}", request?.PhoneNumber);
            return StatusCode(500, new { error = "Ошибка регистрации" });
        }
    }

    /// <summary>
    /// Получение статистики реферальной программы
    /// GET /api/v1/auth/referral-stats
    /// </summary>
    [HttpGet("referral-stats")]
    [Authorize]
    [ProducesResponseType(typeof(ReferralStatsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ReferralStatsResponseDto>> GetReferralStats()
    {
        try
        {
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var stats = await _authService.GetReferralStatsAsync(int.Parse(userId));
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики реферальной программы");
            return StatusCode(500, new { error = "Ошибка сервера" });
        }
    }

    /// <summary>
    /// DTO для запроса refresh токена
    /// </summary>
    public class RefreshTokenRequestDto
    {
        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO для запроса отправки SMS кода
    /// </summary>
    public class SendVerificationCodeRequestDto
    {
        [JsonPropertyName("phone_number")]
        public string PhoneNumber { get; set; } = string.Empty;
    }
}
