using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.DTOs.OrderPayment;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер оплаты заказов
/// Соответствует /api/v1/orders/{order_id}/payment из Python API
/// </summary>
[ApiController]
[Route("api/v1/orders/{order_id}/payment")]
[Tags("Order Payments")]
[Authorize]
public class OrderPaymentsController : ControllerBase
{
    private readonly IOrderPaymentService _paymentService;
    private readonly ILogger<OrderPaymentsController> _logger;

    public OrderPaymentsController(
        IOrderPaymentService paymentService,
        ILogger<OrderPaymentsController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    /// <summary>
    /// Создать платеж для заказа
    /// POST /api/v1/orders/{order_id}/payment
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaymentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PaymentResponseDto>> CreateOrderPayment(
        [FromRoute] int order_id,
        [FromBody] OrderPaymentRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var response = await _paymentService.CreateOrderPaymentAsync(order_id, userId.Value, request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания платежа заказа");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания платежа заказа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить статус оплаты заказа
    /// GET /api/v1/orders/{order_id}/payment/status
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(PaymentStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PaymentStatusResponseDto>> GetPaymentStatus([FromRoute] int order_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var response = await _paymentService.GetPaymentStatusAsync(order_id, userId.Value);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка получения статуса платежа");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статуса платежа");
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

