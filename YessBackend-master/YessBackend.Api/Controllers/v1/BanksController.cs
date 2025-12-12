using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер интеграций с банками (мок)
/// Соответствует /api/v1/banks из Python API
/// </summary>
[ApiController]
[Route("api/v1/banks")]
[Tags("Banks")]
[Authorize]
public class BanksController : ControllerBase
{
    private readonly IBankService _bankService;
    private readonly ILogger<BanksController> _logger;

    public BanksController(
        IBankService bankService,
        ILogger<BanksController> logger)
    {
        _bankService = bankService;
        _logger = logger;
    }

    /// <summary>
    /// Получить список банков
    /// GET /api/v1/banks
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetBankList()
    {
        try
        {
            var result = await _bankService.GetBankListAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения списка банков");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить информацию о банке
    /// GET /api/v1/banks/{bank_code}
    /// </summary>
    [HttpGet("{bank_code}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetBankInfo([FromRoute] string bank_code)
    {
        try
        {
            var result = await _bankService.GetBankInfoAsync(bank_code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения информации о банке");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Проверить карту
    /// POST /api/v1/banks/check-card
    /// </summary>
    [HttpPost("check-card")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CheckCard([FromBody] CheckCardRequest request)
    {
        try
        {
            var result = await _bankService.CheckCardAsync(request.CardNumber);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки карты");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Перевести деньги
    /// POST /api/v1/banks/transfer
    /// </summary>
    [HttpPost("transfer")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> TransferMoney([FromBody] TransferMoneyRequest request)
    {
        try
        {
            var result = await _bankService.TransferMoneyAsync(
                request.FromCard,
                request.ToCard,
                request.Amount,
                request.Description ?? "");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка перевода денег");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить статус перевода
    /// GET /api/v1/banks/transfer/{transaction_id}/status
    /// </summary>
    [HttpGet("transfer/{transaction_id}/status")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetTransferStatus([FromRoute] string transaction_id)
    {
        try
        {
            var result = await _bankService.GetTransferStatusAsync(transaction_id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статуса перевода");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить баланс карты
    /// GET /api/v1/banks/balance/{card_number}
    /// </summary>
    [HttpGet("balance/{card_number}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetBankBalance([FromRoute] string card_number)
    {
        try
        {
            var result = await _bankService.GetBankBalanceAsync(card_number);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения баланса карты");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить историю транзакций
    /// GET /api/v1/banks/history/{card_number}
    /// </summary>
    [HttpGet("history/{card_number}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetTransactionHistory(
        [FromRoute] string card_number,
        [FromQuery] int limit = 50)
    {
        try
        {
            var result = await _bankService.GetTransactionHistoryAsync(card_number, limit);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения истории транзакций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    public class CheckCardRequest
    {
        public string CardNumber { get; set; } = string.Empty;
    }

    public class TransferMoneyRequest
    {
        public string FromCard { get; set; } = string.Empty;
        public string ToCard { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}

