using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер webhooks
/// Соответствует /api/v1/webhooks из Python API
/// </summary>
[ApiController]
[Route("api/v1/webhooks")]
[Tags("Webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IWebhookService _webhookService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IWebhookService webhookService,
        ILogger<WebhooksController> logger)
    {
        _webhookService = webhookService;
        _logger = logger;
    }

    /// <summary>
    /// Webhook для подтверждения платежа от платежного шлюза
    /// POST /api/v1/webhooks/payment/callback
    /// </summary>
    [HttpPost("payment/callback")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> PaymentCallback([FromBody] JsonElement payload, [FromHeader(Name = "X-Signature")] string? x_signature)
    {
        try
        {
            var payloadDict = JsonSerializer.Deserialize<Dictionary<string, object>>(payload.GetRawText())
                ?? throw new InvalidOperationException("Invalid payload");

            var result = await _webhookService.ProcessPaymentCallbackAsync(payloadDict, x_signature);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка обработки webhook");
            if (ex.Message.Contains("signature", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new { error = ex.Message });
            }
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обработки webhook");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

