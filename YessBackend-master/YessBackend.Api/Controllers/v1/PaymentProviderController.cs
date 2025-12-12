using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер платежного провайдера (мок Optima Bank)
/// Соответствует /api/v1/payment-provider из Python API
/// </summary>
[ApiController]
[Route("api/v1/payment-provider")]
[Tags("Payment Provider")]
[Authorize]
public class PaymentProviderController : ControllerBase
{
    private readonly IPaymentProviderService _paymentProviderService;
    private readonly ILogger<PaymentProviderController> _logger;

    public PaymentProviderController(
        IPaymentProviderService paymentProviderService,
        ILogger<PaymentProviderController> logger)
    {
        _paymentProviderService = paymentProviderService;
        _logger = logger;
    }

    /// <summary>
    /// Создать платеж через провайдера
    /// POST /api/v1/payment-provider/payment
    /// </summary>
    [HttpPost("payment")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> CreatePayment([FromBody] object request)
    {
        try
        {
            // Парсим запрос
            var requestDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                request.ToString() ?? "{}") ?? new Dictionary<string, object>();

            var orderId = requestDict.ContainsKey("order_id") 
                ? Convert.ToInt32(requestDict["order_id"].ToString()) 
                : 0;
            var amount = requestDict.ContainsKey("amount") 
                ? Convert.ToDecimal(requestDict["amount"].ToString()) 
                : 0;

            var result = await _paymentProviderService.CreatePaymentAsync(orderId, amount, requestDict);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания платежа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Проверить статус платежа
    /// GET /api/v1/payment-provider/payment/{transaction_id}/status
    /// </summary>
    [HttpGet("payment/{transaction_id}/status")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> CheckPaymentStatus([FromRoute] string transaction_id)
    {
        try
        {
            var result = await _paymentProviderService.CheckPaymentStatusAsync(transaction_id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки статуса платежа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Отменить платеж
    /// POST /api/v1/payment-provider/payment/{transaction_id}/cancel
    /// </summary>
    [HttpPost("payment/{transaction_id}/cancel")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> CancelPayment([FromRoute] string transaction_id)
    {
        try
        {
            var result = await _paymentProviderService.CancelPaymentAsync(transaction_id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отмены платежа");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить доступные методы оплаты
    /// GET /api/v1/payment-provider/methods
    /// </summary>
    [HttpGet("methods")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetPaymentMethods()
    {
        try
        {
            var result = await _paymentProviderService.GetPaymentMethodsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения методов оплаты");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

