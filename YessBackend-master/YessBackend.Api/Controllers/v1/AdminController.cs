using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.DTOs.Admin;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер админ-панели
/// Соответствует /api/v1/admin из Python API
/// </summary>
[ApiController]
[Route("api/v1/admin")]
[Tags("Admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : BaseApiController
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IAdminService adminService,
        ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    #region Dashboard & Statistics

    /// <summary>
    /// Получить статистику дашборда
    /// GET /api/v1/admin/dashboard
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardStatsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboard()
    {
        try
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики дашборда");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить расширенную статистику для дашборда
    /// GET /api/v1/admin/dashboard/stats
    /// </summary>
    [HttpGet("dashboard/stats")]
    [ProducesResponseType(typeof(DashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
    {
        try
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(new { data = stats });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики дашборда");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить графики для дашборда
    /// GET /api/v1/admin/dashboard/charts
    /// </summary>
    [HttpGet("dashboard/charts")]
    [ProducesResponseType(typeof(DashboardChartsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardChartsDto>> GetDashboardCharts([FromQuery] int days = 30)
    {
        try
        {
            var charts = await _adminService.GetDashboardChartsAsync(days);
            return Ok(charts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения графиков дашборда");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить статистику транзакций
    /// GET /api/v1/admin/stats/transactions
    /// </summary>
    [HttpGet("stats/transactions")]
    [ProducesResponseType(typeof(TransactionStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TransactionStatsDto>> GetTransactionStats(
        [FromQuery] DateTime? start_date = null,
        [FromQuery] DateTime? end_date = null)
    {
        try
        {
            var stats = await _adminService.GetTransactionStatsAsync(start_date, end_date);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики транзакций");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region User Management

    /// <summary>
    /// Получить список пользователей
    /// GET /api/v1/admin/users
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminUserDto>>> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] bool? is_active = null,
        [FromQuery] bool? is_blocked = null,
        [FromQuery] int? city_id = null,
        [FromQuery] string? role = null,
        [FromQuery] DateTime? created_from = null,
        [FromQuery] DateTime? created_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var filter = new UserFilterDto
            {
                Search = search,
                IsActive = is_active,
                IsBlocked = is_blocked,
                CityId = city_id,
                Role = role,
                CreatedFrom = created_from,
                CreatedTo = created_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetUsersAsync(filter, pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения пользователей");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить пользователя по ID
    /// GET /api/v1/admin/users/{user_id}
    /// </summary>
    [HttpGet("users/{user_id}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDto>> GetUser([FromRoute] int user_id)
    {
        try
        {
            var user = await _adminService.GetUserByIdAsync(user_id);
            if (user == null)
                return NotFoundResponse("Пользователь не найден");

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Создать пользователя
    /// POST /api/v1/admin/users
    /// </summary>
    [HttpPost("users")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminUserDto>> CreateUser([FromBody] CreateUserRequestDto request)
    {
        try
        {
            var user = await _adminService.CreateUserAsync(request);
            return CreatedAtAction(nameof(GetUser), new { user_id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания пользователя");
            return BadRequestResponse(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания пользователя");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить пользователя
    /// PUT /api/v1/admin/users/{user_id}
    /// </summary>
    [HttpPut("users/{user_id}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDto>> UpdateUser([FromRoute] int user_id, [FromBody] UpdateUserRequestDto request)
    {
        try
        {
            var user = await _adminService.UpdateUserAsync(user_id, request);
            if (user == null)
                return NotFoundResponse("Пользователь не найден");

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Заблокировать пользователя
    /// POST /api/v1/admin/users/{user_id}/block
    /// </summary>
    [HttpPost("users/{user_id}/block")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> BlockUser([FromRoute] int user_id)
    {
        try
        {
            var result = await _adminService.ToggleUserBlockAsync(user_id, true);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка блокировки пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Разблокировать пользователя
    /// POST /api/v1/admin/users/{user_id}/unblock
    /// </summary>
    [HttpPost("users/{user_id}/unblock")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> UnblockUser([FromRoute] int user_id)
    {
        try
        {
            var result = await _adminService.ToggleUserBlockAsync(user_id, false);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка разблокировки пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Активировать пользователя (алиас для совместимости)
    /// POST /api/v1/admin/users/{user_id}/activate
    /// </summary>
    [HttpPost("users/{user_id}/activate")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> ActivateUser([FromRoute] int user_id)
    {
        try
        {
            var result = await _adminService.UpdateUserAsync(user_id, new UpdateUserRequestDto { IsActive = true });
            if (result == null)
                return NotFoundResponse("Пользователь не найден");

            return Ok(OperationResultDto.Ok("Пользователь активирован"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка активации пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Деактивировать пользователя (алиас для совместимости)
    /// POST /api/v1/admin/users/{user_id}/deactivate
    /// </summary>
    [HttpPost("users/{user_id}/deactivate")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> DeactivateUser([FromRoute] int user_id)
    {
        try
        {
            var result = await _adminService.DeleteUserAsync(user_id);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка деактивации пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Деактивировать пользователя
    /// DELETE /api/v1/admin/users/{user_id}
    /// </summary>
    [HttpDelete("users/{user_id}")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> DeleteUser([FromRoute] int user_id)
    {
        try
        {
            var result = await _adminService.DeleteUserAsync(user_id);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Изменить роль пользователя
    /// POST /api/v1/admin/users/{user_id}/role
    /// </summary>
    [HttpPost("users/{user_id}/role")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> ChangeUserRole(
        [FromRoute] int user_id,
        [FromBody] ChangeUserRoleRequestDto request)
    {
        try
        {
            var result = await _adminService.ChangeUserRoleAsync(user_id, request);
            if (!result.Success)
                return BadRequestResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка изменения роли пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Partner Management

    /// <summary>
    /// Получить список партнеров
    /// GET /api/v1/admin/partners
    /// </summary>
    [HttpGet("partners")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminPartnerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminPartnerDto>>> GetPartners(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] int? city_id = null,
        [FromQuery] bool? is_active = null,
        [FromQuery] bool? is_verified = null,
        [FromQuery] bool? has_owner = null,
        [FromQuery] DateTime? created_from = null,
        [FromQuery] DateTime? created_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var filter = new PartnerFilterDto
            {
                Search = search,
                Category = category,
                CityId = city_id,
                IsActive = is_active,
                IsVerified = is_verified,
                HasOwner = has_owner,
                CreatedFrom = created_from,
                CreatedTo = created_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetPartnersAsync(filter, pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения партнеров");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить партнера по ID
    /// GET /api/v1/admin/partners/{partner_id}
    /// </summary>
    [HttpGet("partners/{partner_id}")]
    [ProducesResponseType(typeof(AdminPartnerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminPartnerDto>> GetPartner([FromRoute] int partner_id)
    {
        try
        {
            var partner = await _adminService.GetPartnerByIdAsync(partner_id);
            if (partner == null)
                return NotFoundResponse("Партнер не найден");

            return Ok(partner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения партнера {PartnerId}", partner_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Создать партнера
    /// POST /api/v1/admin/partners
    /// </summary>
    [HttpPost("partners")]
    [ProducesResponseType(typeof(AdminPartnerDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminPartnerDto>> CreatePartner([FromBody] CreatePartnerRequestDto request)
    {
        try
        {
            var partner = await _adminService.CreatePartnerAsync(request);
            return CreatedAtAction(nameof(GetPartner), new { partner_id = partner.Id }, partner);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания партнера");
            return BadRequestResponse(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить партнера
    /// PUT /api/v1/admin/partners/{partner_id}
    /// </summary>
    [HttpPut("partners/{partner_id}")]
    [ProducesResponseType(typeof(AdminPartnerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminPartnerDto>> UpdatePartner(
        [FromRoute] int partner_id,
        [FromBody] UpdatePartnerRequestDto request)
    {
        try
        {
            var partner = await _adminService.UpdatePartnerAsync(partner_id, request);
            if (partner == null)
                return NotFoundResponse("Партнер не найден");

            return Ok(partner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления партнера {PartnerId}", partner_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Верифицировать партнера
    /// POST /api/v1/admin/partners/{partner_id}/verify
    /// </summary>
    [HttpPost("partners/{partner_id}/verify")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> VerifyPartner([FromRoute] int partner_id)
    {
        try
        {
            var result = await _adminService.VerifyPartnerAsync(partner_id);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка верификации партнера {PartnerId}", partner_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Одобрить партнера (алиас для verify)
    /// POST /api/v1/admin/partners/{partner_id}/approve
    /// </summary>
    [HttpPost("partners/{partner_id}/approve")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> ApprovePartner([FromRoute] int partner_id)
    {
        // Используем тот же метод, что и verify
        return await VerifyPartner(partner_id);
    }

    /// <summary>
    /// Отклонить партнера
    /// POST /api/v1/admin/partners/{partner_id}/reject
    /// </summary>
    [HttpPost("partners/{partner_id}/reject")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> RejectPartner(
        [FromRoute] int partner_id,
        [FromBody] RejectPartnerRequestDto? request = null)
    {
        try
        {
            // Отклонение = деактивация + установка is_verified = false
            var partner = await _adminService.UpdatePartnerAsync(partner_id, new UpdatePartnerRequestDto
            {
                IsActive = false,
                IsVerified = false
            });

            if (partner == null)
                return NotFoundResponse("Партнер не найден");

            return Ok(OperationResultDto.Ok($"Партнер отклонен. Причина: {request?.Reason ?? "Не указана"}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отклонения партнера {PartnerId}", partner_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Деактивировать партнера
    /// DELETE /api/v1/admin/partners/{partner_id}
    /// </summary>
    [HttpDelete("partners/{partner_id}")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> DeletePartner([FromRoute] int partner_id)
    {
        try
        {
            var result = await _adminService.DeletePartnerAsync(partner_id);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления партнера {PartnerId}", partner_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить категории партнеров
    /// GET /api/v1/admin/partners/categories
    /// </summary>
    [HttpGet("partners/categories")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<string>>> GetPartnerCategories()
    {
        try
        {
            var categories = await _adminService.GetPartnerCategoriesAsync();
            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения категорий партнеров");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Transaction Management

    /// <summary>
    /// Получить список транзакций
    /// GET /api/v1/admin/transactions
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminTransactionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminTransactionDto>>> GetTransactions(
        [FromQuery] string? search = null,
        [FromQuery] int? user_id = null,
        [FromQuery] int? partner_id = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] decimal? min_amount = null,
        [FromQuery] decimal? max_amount = null,
        [FromQuery] DateTime? created_from = null,
        [FromQuery] DateTime? created_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var filter = new TransactionFilterDto
            {
                Search = search,
                UserId = user_id,
                PartnerId = partner_id,
                Type = type,
                Status = status,
                MinAmount = min_amount,
                MaxAmount = max_amount,
                CreatedFrom = created_from,
                CreatedTo = created_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetTransactionsAsync(filter, pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзакций");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить транзакцию по ID
    /// GET /api/v1/admin/transactions/{transaction_id}
    /// </summary>
    [HttpGet("transactions/{transaction_id}")]
    [ProducesResponseType(typeof(AdminTransactionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminTransactionDto>> GetTransaction([FromRoute] int transaction_id)
    {
        try
        {
            var transaction = await _adminService.GetTransactionByIdAsync(transaction_id);
            if (transaction == null)
                return NotFoundResponse("Транзакция не найдена");

            return Ok(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзакции {TransactionId}", transaction_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить статус транзакции
    /// PUT /api/v1/admin/transactions/{transaction_id}/status
    /// </summary>
    [HttpPut("transactions/{transaction_id}/status")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> UpdateTransactionStatus(
        [FromRoute] int transaction_id,
        [FromBody] UpdateTransactionStatusDto request)
    {
        try
        {
            var result = await _adminService.UpdateTransactionStatusAsync(transaction_id, request);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления статуса транзакции {TransactionId}", transaction_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Order Management

    /// <summary>
    /// Получить список заказов
    /// GET /api/v1/admin/orders
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminOrderDto>>> GetOrders(
        [FromQuery] string? search = null,
        [FromQuery] int? user_id = null,
        [FromQuery] int? partner_id = null,
        [FromQuery] string? status = null,
        [FromQuery] decimal? min_amount = null,
        [FromQuery] decimal? max_amount = null,
        [FromQuery] DateTime? created_from = null,
        [FromQuery] DateTime? created_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var filter = new OrderFilterDto
            {
                Search = search,
                UserId = user_id,
                PartnerId = partner_id,
                Status = status,
                MinAmount = min_amount,
                MaxAmount = max_amount,
                CreatedFrom = created_from,
                CreatedTo = created_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetOrdersAsync(filter, pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения заказов");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить заказ по ID
    /// GET /api/v1/admin/orders/{order_id}
    /// </summary>
    [HttpGet("orders/{order_id}")]
    [ProducesResponseType(typeof(AdminOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminOrderDto>> GetOrder([FromRoute] int order_id)
    {
        try
        {
            var order = await _adminService.GetOrderByIdAsync(order_id);
            if (order == null)
                return NotFoundResponse("Заказ не найден");

            return Ok(order);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения заказа {OrderId}", order_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить статус заказа
    /// PUT /api/v1/admin/orders/{order_id}/status
    /// </summary>
    [HttpPut("orders/{order_id}/status")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> UpdateOrderStatus(
        [FromRoute] int order_id,
        [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            var result = await _adminService.UpdateOrderStatusAsync(order_id, request);
            if (!result.Success)
                return BadRequestResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления статуса заказа {OrderId}", order_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region City Management

    /// <summary>
    /// Получить список городов
    /// GET /api/v1/admin/cities
    /// </summary>
    [HttpGet("cities")]
    [ProducesResponseType(typeof(List<CityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CityDto>>> GetCities()
    {
        try
        {
            var cities = await _adminService.GetCitiesAsync();
            return Ok(new { items = cities, total = cities.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения городов");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Создать город
    /// POST /api/v1/admin/cities
    /// </summary>
    [HttpPost("cities")]
    [ProducesResponseType(typeof(CityDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CityDto>> CreateCity([FromBody] CreateCityRequestDto request)
    {
        try
        {
            var city = await _adminService.CreateCityAsync(request);
            return CreatedAtAction(nameof(GetCities), new { }, city);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания города");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Удалить город
    /// DELETE /api/v1/admin/cities/{city_id}
    /// </summary>
    [HttpDelete("cities/{city_id}")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OperationResultDto>> DeleteCity([FromRoute] int city_id)
    {
        try
        {
            var result = await _adminService.DeleteCityAsync(city_id);
            if (!result.Success)
                return BadRequestResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления города {CityId}", city_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Notification Management

    /// <summary>
    /// Получить список уведомлений
    /// GET /api/v1/admin/notifications
    /// </summary>
    [HttpGet("notifications")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminNotificationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminNotificationDto>>> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetNotificationsAsync(pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уведомлений");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Отправить массовое уведомление
    /// POST /api/v1/admin/notifications/broadcast
    /// </summary>
    [HttpPost("notifications/broadcast")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OperationResultDto>> BroadcastNotification([FromBody] BroadcastNotificationRequestDto request)
    {
        try
        {
            var result = await _adminService.BroadcastNotificationAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки массового уведомления");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Wallet Management

    /// <summary>
    /// Получить список кошельков
    /// GET /api/v1/admin/wallets
    /// </summary>
    [HttpGet("wallets")]
    [ProducesResponseType(typeof(PaginatedResponseDto<AdminWalletDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponseDto<AdminWalletDto>>> GetWallets(
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            var pagination = new PaginationParams { Page = page, PageSize = page_size };
            var result = await _adminService.GetWalletsAsync(pagination);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения кошельков");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Корректировать баланс кошелька
    /// POST /api/v1/admin/wallets/{user_id}/adjust
    /// </summary>
    [HttpPost("wallets/{user_id}/adjust")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResultDto>> AdjustWalletBalance(
        [FromRoute] int user_id,
        [FromBody] AdjustWalletRequestDto request)
    {
        try
        {
            var result = await _adminService.AdjustWalletBalanceAsync(user_id, request.Amount, request.Reason);
            if (!result.Success)
                return NotFoundResponse(result.Message);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка корректировки баланса пользователя {UserId}", user_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Admin Profile

    /// <summary>
    /// Получить профиль текущего администратора
    /// GET /api/v1/admin/me
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(AdminProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminProfileDto>> GetCurrentAdmin()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var profile = await _adminService.GetAdminProfileAsync(userId.Value);
            if (profile == null)
                return UnauthorizedResponse("Пользователь не найден");

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения профиля администратора");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Reports

    /// <summary>
    /// Получить отчет по пользователям
    /// GET /api/v1/admin/reports/users
    /// </summary>
    [HttpGet("reports/users")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetUsersReport(
        [FromQuery] DateTime? start_date = null,
        [FromQuery] DateTime? end_date = null)
    {
        try
        {
            var report = await _adminService.GetUsersReportAsync(start_date, end_date);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения отчета по пользователям");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить отчет по партнерам
    /// GET /api/v1/admin/reports/partners
    /// </summary>
    [HttpGet("reports/partners")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetPartnersReport()
    {
        try
        {
            var report = await _adminService.GetPartnersReportAsync();
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения отчета по партнерам");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Promotions (Legacy endpoints)

    /// <summary>
    /// Получить список акций
    /// GET /api/v1/admin/promotions
    /// </summary>
    [HttpGet("promotions")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetPromotions(
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        // TODO: Implement through service
        return Ok(new { items = new List<object>(), total = 0, page, page_size });
    }

    #endregion
}

/// <summary>
/// DTO для корректировки баланса
/// </summary>
public class AdjustWalletRequestDto
{
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO для отклонения партнера
/// </summary>
public class RejectPartnerRequestDto
{
    public string? Reason { get; set; }
}
