using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.DTOs.Wallet;
using YessBackend.Application.Services;
using AutoMapper;
using System.Security.Claims;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер кошелька
/// Соответствует /api/v1/wallet из Python API
/// </summary>
[ApiController]
[Route("api/v1/wallet")]
[Tags("Wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;
    private readonly IMapper _mapper;
    private readonly ILogger<WalletController> _logger;

    public WalletController(
        IWalletService walletService,
        IMapper mapper,
        ILogger<WalletController> logger)
    {
        _walletService = walletService;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Получить информацию о кошельке
    /// GET /api/v1/wallet
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(WalletResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WalletResponseDto>> GetWallet()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var wallet = await _walletService.GetWalletByUserIdAsync(userId.Value);
            if (wallet == null)
            {
                return NotFound(new { error = "Кошелек не найден" });
            }

            var response = _mapper.Map<WalletResponseDto>(wallet);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения кошелька");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить баланс
    /// GET /api/v1/wallet/balance
    /// </summary>
    [HttpGet("balance")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetBalance()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var balance = await _walletService.GetBalanceAsync(userId.Value);
            var yescoinBalance = await _walletService.GetYescoinBalanceAsync(userId.Value);

            return Ok(new
            {
                balance = balance,
                yescoin_balance = yescoinBalance
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения баланса");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить историю транзакций
    /// GET /api/v1/wallet/transactions
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(List<TransactionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TransactionResponseDto>>> GetTransactions(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var transactions = await _walletService.GetUserTransactionsAsync(userId.Value, limit, offset);
            var response = transactions.Select(t => _mapper.Map<TransactionResponseDto>(t)).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзакций");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Синхронизация баланса кошелька между сайтом и приложением
    /// POST /api/v1/wallet/sync
    /// </summary>
    [HttpPost("sync")]
    [ProducesResponseType(typeof(WalletSyncResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WalletSyncResponseDto>> SyncWallet([FromBody] WalletSyncRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Используем userId из токена, игнорируя user_id из запроса для безопасности
            request.UserId = userId.Value;

            var response = await _walletService.SyncWalletAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка синхронизации кошелька");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Пополнение кошелька с генерацией QR кода
    /// POST /api/v1/wallet/topup
    /// </summary>
    [HttpPost("topup")]
    [ProducesResponseType(typeof(TopUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TopUpResponseDto>> TopUpWallet([FromBody] TopUpRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Используем userId из токена для безопасности
            request.UserId = userId.Value;

            var response = await _walletService.TopUpWalletAsync(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка пополнения кошелька");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка пополнения кошелька");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Webhook для подтверждения платежей
    /// POST /api/v1/wallet/webhook
    /// </summary>
    [HttpPost("webhook")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> PaymentWebhook(
        [FromQuery] int transaction_id,
        [FromQuery] string status,
        [FromQuery] decimal amount)
    {
        try
        {
            var result = await _walletService.ProcessPaymentWebhookAsync(transaction_id, status, amount);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка обработки webhook");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обработки webhook");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить историю транзакций (альтернативный endpoint)
    /// GET /api/v1/wallet/history
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(List<TransactionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TransactionResponseDto>>> GetHistory(
        [FromQuery] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Проверяем, что пользователь запрашивает свою историю
            if (currentUserId.Value != user_id)
            {
                return Forbid("Доступ запрещен");
            }

            var transactions = await _walletService.GetTransactionHistoryAsync(user_id);
            var response = transactions.Select(t => _mapper.Map<TransactionResponseDto>(t)).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения истории транзакций");
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
