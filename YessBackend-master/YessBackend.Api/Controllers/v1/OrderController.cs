using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.DTOs.Order;
using YessBackend.Application.Services;
using AutoMapper;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер заказов
/// Соответствует /api/v1/orders из Python API
/// </summary>
[ApiController]
[Route("api/v1/orders")]
[Tags("Orders")]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IMapper _mapper;
    private readonly ILogger<OrderController> _logger;

    public OrderController(
        IOrderService orderService,
        IMapper mapper,
        ILogger<OrderController> logger)
    {
        _orderService = orderService;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Рассчитать стоимость заказа
    /// POST /api/v1/orders/calculate
    /// </summary>
    [HttpPost("calculate")]
    [ProducesResponseType(typeof(OrderCalculateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderCalculateResponseDto>> CalculateOrder(
        [FromBody] OrderCalculateRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var calculation = await _orderService.CalculateOrderAsync(
                request.PartnerId,
                request.Items,
                userId);

            return Ok(calculation);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка расчета заказа");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка расчета заказа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Создать новый заказ
    /// POST /api/v1/orders
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(OrderResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderResponseDto>> CreateOrder(
        [FromBody] OrderCreateRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var order = await _orderService.CreateOrderAsync(userId.Value, request);
            var response = _mapper.Map<OrderResponseDto>(order);

            return CreatedAtAction(
                nameof(GetOrder),
                new { order_id = order.Id },
                response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания заказа");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания заказа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить информацию о заказе
    /// GET /api/v1/orders/{order_id}
    /// </summary>
    [HttpGet("{order_id}")]
    [ProducesResponseType(typeof(OrderResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderResponseDto>> GetOrder(int order_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var order = await _orderService.GetOrderByIdAsync(order_id, userId);

            if (order == null)
            {
                return NotFound(new { error = "Заказ не найден" });
            }

            var response = _mapper.Map<OrderResponseDto>(order);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения заказа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить список заказов пользователя
    /// GET /api/v1/orders
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<OrderResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<OrderResponseDto>>> GetUserOrders(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var orders = await _orderService.GetUserOrdersAsync(userId.Value, limit, offset);
            var response = orders.Select(o => _mapper.Map<OrderResponseDto>(o)).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения заказов");
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
