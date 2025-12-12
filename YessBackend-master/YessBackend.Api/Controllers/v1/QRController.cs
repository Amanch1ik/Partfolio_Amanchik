using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.DTOs.QR;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер QR кодов
/// Соответствует /api/v1/qr из Python API
/// </summary>
[ApiController]
[Route("api/v1/qr")]
[Tags("QR Codes")]
[Authorize]
public class QRController : ControllerBase
{
    private readonly IQRService _qrService;
    private readonly ILogger<QRController> _logger;

    public QRController(
        IQRService qrService,
        ILogger<QRController> logger)
    {
        _qrService = qrService;
        _logger = logger;
    }

    /// <summary>
    /// Сканирование QR кода партнера
    /// POST /api/v1/qr/scan
    /// </summary>
    [HttpPost("scan")]
    [ProducesResponseType(typeof(QRScanResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<QRScanResponseDto>> ScanQRCode([FromBody] QRScanRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var response = await _qrService.ScanQRCodeAsync(userId.Value, request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка сканирования QR кода");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка сканирования QR кода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Оплата через QR код
    /// POST /api/v1/qr/pay
    /// </summary>
    [HttpPost("pay")]
    [ProducesResponseType(typeof(QRPaymentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<QRPaymentResponseDto>> PayWithQR([FromBody] QRPaymentRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var response = await _qrService.PayWithQRAsync(userId.Value, request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка оплаты через QR код");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка оплаты через QR код");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Генерация QR кода для партнера
    /// POST /api/v1/qr/generate/{partner_id}
    /// </summary>
    [HttpPost("generate/{partner_id}")]
    [ProducesResponseType(typeof(QRGenerateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<QRGenerateResponseDto>> GeneratePartnerQR([FromRoute] int partner_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // TODO: Проверить права доступа (только владелец партнера или админ)

            var response = await _qrService.GeneratePartnerQRAsync(partner_id);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка генерации QR кода");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка генерации QR кода");
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

