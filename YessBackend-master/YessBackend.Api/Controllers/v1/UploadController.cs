using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер загрузки файлов
/// Соответствует /api/v1/upload из Python API
/// Заглушки для файлового хранилища
/// </summary>
[ApiController]
[Route("api/v1/upload")]
[Tags("File Upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly ILogger<UploadController> _logger;

    public UploadController(
        IStorageService storageService,
        ILogger<UploadController> logger)
    {
        _storageService = storageService;
        _logger = logger;
    }

    /// <summary>
    /// Загрузка аватара пользователя
    /// POST /api/v1/upload/avatar
    /// </summary>
    [HttpPost("avatar")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> UploadAvatar([FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Файл не предоставлен" });
            }

            var avatarUrl = await _storageService.SaveFileAsync(file, "profiles");
            
            // TODO: Обновить avatar_url пользователя в БД
            // await _userService.UpdateAvatarAsync(userId.Value, avatarUrl);

            return Ok(new
            {
                success = true,
                avatar_url = avatarUrl,
                message = "Avatar uploaded successfully (mock)"
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка загрузки аватара");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки аватара");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Загрузка логотипа партнера
    /// POST /api/v1/upload/partner/logo/{partner_id}
    /// </summary>
    [HttpPost("partner/logo/{partner_id}")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> UploadPartnerLogo(
        [FromRoute] int partner_id,
        [FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Файл не предоставлен" });
            }

            // TODO: Проверить права доступа (только владелец партнера или админ)

            var logoUrl = await _storageService.SaveFileAsync(file, "partners");
            
            // TODO: Обновить logo_url партнера в БД
            // await _partnerService.UpdateLogoAsync(partner_id, logoUrl);

            return Ok(new
            {
                success = true,
                logo_url = logoUrl,
                message = "Logo uploaded successfully (mock)"
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка загрузки логотипа партнера");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки логотипа партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Загрузка обложки партнера
    /// POST /api/v1/upload/partner/cover/{partner_id}
    /// </summary>
    [HttpPost("partner/cover/{partner_id}")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> UploadPartnerCover(
        [FromRoute] int partner_id,
        [FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Файл не предоставлен" });
            }

            // TODO: Проверить права доступа (только владелец партнера или админ)

            var coverUrl = await _storageService.SaveFileAsync(file, "partners");
            
            // TODO: Обновить cover_url партнера в БД
            // await _partnerService.UpdateCoverAsync(partner_id, coverUrl);

            return Ok(new
            {
                success = true,
                cover_url = coverUrl,
                message = "Cover uploaded successfully (mock)"
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка загрузки обложки партнера");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки обложки партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Удаление аватара пользователя
    /// DELETE /api/v1/upload/avatar
    /// </summary>
    [HttpDelete("avatar")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> DeleteAvatar()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // TODO: Получить avatar_url пользователя и удалить файл
            // var user = await _userService.GetUserByIdAsync(userId.Value);
            // if (!string.IsNullOrEmpty(user.AvatarUrl))
            // {
            //     await _storageService.DeleteFileAsync(user.AvatarUrl);
            //     await _userService.UpdateAvatarAsync(userId.Value, null);
            // }

            return Ok(new
            {
                success = true,
                message = "Avatar deleted successfully (mock)"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления аватара");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}

