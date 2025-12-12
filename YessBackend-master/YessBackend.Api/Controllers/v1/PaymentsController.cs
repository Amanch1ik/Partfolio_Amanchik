using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YessBackend.Application.Services;
using YessBackend.Application.DTOs.Wallet;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер платежей (совместимость с frontend)
/// Frontend использует /api/v1/payments/* вместо /api/v1/wallet/*
/// </summary>
[ApiController]
[Route("api/v1/payments")]
[Tags("Payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IWalletService _walletService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IWalletService walletService,
        ApplicationDbContext context,
        ILogger<PaymentsController> logger)
    {
        _walletService = walletService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Получить баланс пользователя
    /// GET /api/v1/payments/balance
    /// Используется frontend приложением
    /// </summary>
    [HttpGet("balance")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetBalance()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // ОДИН запрос к БД вместо трех - получаем весь объект кошелька
            var wallet = await _walletService.GetWalletByUserIdAsync(userId.Value);
            
            // Если кошелька нет, создаем его (если нужно)
            if (wallet == null)
            {
                // Можно создать кошелек здесь или в сервисе
                // Пока возвращаем нулевой баланс
                return Ok(new
                {
                    balance = 0m,
                    currency = "KGS",
                    yescoin_balance = 0m,
                    last_updated = DateTime.UtcNow
                });
            }

            // Используем данные из одного объекта wallet вместо трех запросов
            return Ok(new
            {
                balance = wallet.Balance,
                currency = "KGS",
                yescoin_balance = wallet.YescoinBalance,
                last_updated = wallet.LastUpdated
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
    /// GET /api/v1/payments/transactions
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var offset = (page - 1) * page_size;
            var transactions = await _walletService.GetUserTransactionsAsync(userId.Value, page_size, offset);
            
            // Загружаем связанные данные (Partner) для каждой транзакции
            var transactionsWithPartner = new List<object>();
            foreach (var t in transactions)
            {
                string? partnerName = null;
                if (t.PartnerId.HasValue)
                {
                    var partner = await _context.Partners
                        .FirstOrDefaultAsync(p => p.Id == t.PartnerId.Value);
                    partnerName = partner?.Name;
                }

                transactionsWithPartner.Add(new
                {
                    id = t.Id,
                    type = t.Type.ToLower(),
                    amount = t.Amount,
                    commission = t.Commission,
                    payment_method = t.PaymentMethod,
                    status = t.Status.ToLower(),
                    partner_id = t.PartnerId,
                    partner_name = partnerName,
                    description = t.Description,
                    yescoin_used = t.YescoinUsed,
                    yescoin_earned = t.YescoinEarned,
                    balance_before = t.BalanceBefore,
                    balance_after = t.BalanceAfter,
                    created_at = t.CreatedAt,
                    processed_at = t.ProcessedAt,
                    completed_at = t.CompletedAt,
                    error_message = t.ErrorMessage
                });
            }

            return Ok(new
            {
                transactions = transactionsWithPartner,
                total_count = transactions.Count,
                page = page,
                page_size = page_size
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзакций");
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
