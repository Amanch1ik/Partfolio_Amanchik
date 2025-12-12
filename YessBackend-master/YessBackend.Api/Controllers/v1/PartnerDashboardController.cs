using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.DTOs.PartnerDashboard;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер дашборда партнера
/// Соответствует /api/v1/partner из Python API
/// </summary>
[ApiController]
[Route("api/v1/partner")]
[Tags("Partner Dashboard")]
[Authorize(Policy = "PartnerOnly")]
public class PartnerDashboardController : BaseApiController
{
    private readonly IPartnerDashboardService _partnerService;
    private readonly ILogger<PartnerDashboardController> _logger;

    public PartnerDashboardController(
        IPartnerDashboardService partnerService,
        ILogger<PartnerDashboardController> logger)
    {
        _partnerService = partnerService;
        _logger = logger;
    }

    #region Profile

    /// <summary>
    /// Получить профиль текущего партнера
    /// GET /api/v1/partner/me
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PartnerProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PartnerProfileDto>> GetCurrentPartner()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var profile = await _partnerService.GetPartnerProfileAsync(userId.Value);
            if (profile == null)
                return ForbiddenResponse("Пользователь не является партнером");

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения профиля партнера");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Dashboard & Statistics

    /// <summary>
    /// Получить статистику партнера
    /// GET /api/v1/partner/stats
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(PartnerStatsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PartnerStatsDto>> GetPartnerStats()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var stats = await _partnerService.GetPartnerStatsAsync(partnerId.Value);
            if (stats == null)
                return NotFoundResponse("Партнер не найден");

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить графики для дашборда партнера
    /// GET /api/v1/partner/charts
    /// </summary>
    [HttpGet("charts")]
    [ProducesResponseType(typeof(PartnerChartsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerChartsDto>> GetPartnerCharts([FromQuery] int days = 30)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var charts = await _partnerService.GetPartnerChartsAsync(partnerId.Value, days);
            return Ok(charts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения графиков партнера");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Transactions

    /// <summary>
    /// Получить транзакции партнера
    /// GET /api/v1/partner/transactions
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(PartnerPaginatedResponseDto<PartnerTransactionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerPaginatedResponseDto<PartnerTransactionDto>>> GetTransactions(
        [FromQuery] string? search = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] int? location_id = null,
        [FromQuery] decimal? min_amount = null,
        [FromQuery] decimal? max_amount = null,
        [FromQuery] DateTime? date_from = null,
        [FromQuery] DateTime? date_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var filter = new PartnerTransactionFilterDto
            {
                Search = search,
                Type = type,
                Status = status,
                LocationId = location_id,
                MinAmount = min_amount,
                MaxAmount = max_amount,
                DateFrom = date_from,
                DateTo = date_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var result = await _partnerService.GetTransactionsAsync(partnerId.Value, filter, limit, offset);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзакций партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить транзакцию по ID
    /// GET /api/v1/partner/transactions/{transaction_id}
    /// </summary>
    [HttpGet("transactions/{transaction_id}")]
    [ProducesResponseType(typeof(PartnerTransactionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerTransactionDto>> GetTransaction([FromRoute] int transaction_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var transaction = await _partnerService.GetTransactionByIdAsync(partnerId.Value, transaction_id);
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

    #endregion

    #region Orders

    /// <summary>
    /// Получить заказы партнера
    /// GET /api/v1/partner/orders
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType(typeof(PartnerPaginatedResponseDto<PartnerOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerPaginatedResponseDto<PartnerOrderDto>>> GetOrders(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? payment_status = null,
        [FromQuery] int? location_id = null,
        [FromQuery] decimal? min_amount = null,
        [FromQuery] decimal? max_amount = null,
        [FromQuery] DateTime? date_from = null,
        [FromQuery] DateTime? date_to = null,
        [FromQuery] string sort_by = "created_at",
        [FromQuery] bool sort_desc = true,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var filter = new PartnerOrderFilterDto
            {
                Search = search,
                Status = status,
                PaymentStatus = payment_status,
                LocationId = location_id,
                MinAmount = min_amount,
                MaxAmount = max_amount,
                DateFrom = date_from,
                DateTo = date_to,
                SortBy = sort_by,
                SortDesc = sort_desc
            };

            var result = await _partnerService.GetOrdersAsync(partnerId.Value, filter, limit, offset);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения заказов партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить заказ по ID
    /// GET /api/v1/partner/orders/{order_id}
    /// </summary>
    [HttpGet("orders/{order_id}")]
    [ProducesResponseType(typeof(PartnerOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerOrderDto>> GetOrder([FromRoute] int order_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var order = await _partnerService.GetOrderByIdAsync(partnerId.Value, order_id);
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
    /// PUT /api/v1/partner/orders/{order_id}/status
    /// </summary>
    [HttpPut("orders/{order_id}/status")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> UpdateOrderStatus(
        [FromRoute] int order_id,
        [FromBody] UpdatePartnerOrderStatusDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var success = await _partnerService.UpdateOrderStatusAsync(partnerId.Value, order_id, request.Status, request.Notes);
            if (!success)
                return NotFoundResponse("Заказ не найден или неверный статус");

            return Ok(new { success = true, message = "Статус заказа обновлен" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления статуса заказа {OrderId}", order_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Products

    /// <summary>
    /// Получить продукты партнера
    /// GET /api/v1/partner/products
    /// </summary>
    [HttpGet("products")]
    [ProducesResponseType(typeof(PartnerPaginatedResponseDto<PartnerProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerPaginatedResponseDto<PartnerProductDto>>> GetProducts(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? is_active = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var result = await _partnerService.GetProductsAsync(partnerId.Value, search, category, is_active, limit, offset);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения продуктов партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить продукт по ID
    /// GET /api/v1/partner/products/{product_id}
    /// </summary>
    [HttpGet("products/{product_id}")]
    [ProducesResponseType(typeof(PartnerProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerProductDto>> GetProduct([FromRoute] int product_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var product = await _partnerService.GetProductByIdAsync(partnerId.Value, product_id);
            if (product == null)
                return NotFoundResponse("Продукт не найден");

            return Ok(product);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения продукта {ProductId}", product_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Создать продукт
    /// POST /api/v1/partner/products
    /// </summary>
    [HttpPost("products")]
    [ProducesResponseType(typeof(PartnerProductDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<PartnerProductDto>> CreateProduct([FromBody] PartnerProductRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var product = await _partnerService.CreateProductAsync(partnerId.Value, request);
            return CreatedAtAction(nameof(GetProduct), new { product_id = product.Id }, product);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания продукта");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить продукт
    /// PUT /api/v1/partner/products/{product_id}
    /// </summary>
    [HttpPut("products/{product_id}")]
    [ProducesResponseType(typeof(PartnerProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerProductDto>> UpdateProduct(
        [FromRoute] int product_id,
        [FromBody] PartnerProductRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var product = await _partnerService.UpdateProductAsync(partnerId.Value, product_id, request);
            if (product == null)
                return NotFoundResponse("Продукт не найден");

            return Ok(product);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления продукта {ProductId}", product_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Удалить продукт
    /// DELETE /api/v1/partner/products/{product_id}
    /// </summary>
    [HttpDelete("products/{product_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteProduct([FromRoute] int product_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var success = await _partnerService.DeleteProductAsync(partnerId.Value, product_id);
            if (!success)
                return NotFoundResponse("Продукт не найден");

            return Ok(new { success = true, message = "Продукт удален" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления продукта {ProductId}", product_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить категории продуктов
    /// GET /api/v1/partner/products/categories
    /// </summary>
    [HttpGet("products/categories")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<string>>> GetProductCategories()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var categories = await _partnerService.GetProductCategoriesAsync(partnerId.Value);
            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения категорий продуктов");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Locations

    /// <summary>
    /// Получить локации партнера
    /// GET /api/v1/partner/locations
    /// </summary>
    [HttpGet("locations")]
    [ProducesResponseType(typeof(List<PartnerLocationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PartnerLocationDto>>> GetLocations()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var locations = await _partnerService.GetLocationsAsync(partnerId.Value);
            return Ok(locations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения локаций партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Получить локацию по ID
    /// GET /api/v1/partner/locations/{location_id}
    /// </summary>
    [HttpGet("locations/{location_id}")]
    [ProducesResponseType(typeof(PartnerLocationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerLocationDto>> GetLocation([FromRoute] int location_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var location = await _partnerService.GetLocationByIdAsync(partnerId.Value, location_id);
            if (location == null)
                return NotFoundResponse("Локация не найдена");

            return Ok(location);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения локации {LocationId}", location_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Employees

    /// <summary>
    /// Получить сотрудников партнера
    /// GET /api/v1/partner/employees
    /// </summary>
    [HttpGet("employees")]
    [ProducesResponseType(typeof(List<PartnerEmployeeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PartnerEmployeeDto>>> GetEmployees()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // Check if user is owner
            var isOwner = await _partnerService.IsPartnerOwnerAsync(userId.Value, partnerId.Value);
            if (!isOwner)
                return ForbiddenResponse("Только владелец может управлять сотрудниками");

            var employees = await _partnerService.GetEmployeesAsync(partnerId.Value);
            return Ok(employees);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения сотрудников партнера");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Добавить сотрудника
    /// POST /api/v1/partner/employees
    /// </summary>
    [HttpPost("employees")]
    [ProducesResponseType(typeof(PartnerEmployeeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PartnerEmployeeDto>> AddEmployee([FromBody] AddEmployeeRequestDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var isOwner = await _partnerService.IsPartnerOwnerAsync(userId.Value, partnerId.Value);
            if (!isOwner)
                return ForbiddenResponse("Только владелец может добавлять сотрудников");

            var employee = await _partnerService.AddEmployeeAsync(partnerId.Value, request);
            if (employee == null)
                return BadRequestResponse("Пользователь не найден или уже является сотрудником");

            return CreatedAtAction(nameof(GetEmployees), new { }, employee);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка добавления сотрудника");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Удалить сотрудника
    /// DELETE /api/v1/partner/employees/{employee_id}
    /// </summary>
    [HttpDelete("employees/{employee_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> RemoveEmployee([FromRoute] int employee_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var isOwner = await _partnerService.IsPartnerOwnerAsync(userId.Value, partnerId.Value);
            if (!isOwner)
                return ForbiddenResponse("Только владелец может удалять сотрудников");

            var success = await _partnerService.RemoveEmployeeAsync(partnerId.Value, employee_id);
            if (!success)
                return NotFoundResponse("Сотрудник не найден");

            return Ok(new { success = true, message = "Сотрудник удален" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления сотрудника {EmployeeId}", employee_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Reports

    /// <summary>
    /// Получить отчет по продажам
    /// GET /api/v1/partner/reports/sales
    /// </summary>
    [HttpGet("reports/sales")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetSalesReport(
        [FromQuery] DateTime? start_date = null,
        [FromQuery] DateTime? end_date = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var report = await _partnerService.GetSalesReportAsync(partnerId.Value, start_date, end_date);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения отчета по продажам");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Dashboard Stats (Alias)

    /// <summary>
    /// Получить статистику партнера (алиас для совместимости)
    /// GET /api/v1/partner/dashboard/stats
    /// </summary>
    [HttpGet("dashboard/stats")]
    [ProducesResponseType(typeof(PartnerStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerStatsDto>> GetDashboardStats()
    {
        return await GetPartnerStats();
    }

    #endregion

    #region Locations (CRUD)

    /// <summary>
    /// Создать локацию партнера
    /// POST /api/v1/partner/locations
    /// </summary>
    [HttpPost("locations")]
    [ProducesResponseType(typeof(PartnerLocationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PartnerLocationDto>> CreateLocation([FromBody] CreatePartnerLocationDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать в IPartnerDashboardService
            return BadRequestResponse("Создание локаций будет реализовано в следующей версии");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания локации");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Обновить локацию партнера
    /// PUT /api/v1/partner/locations/{location_id}
    /// </summary>
    [HttpPut("locations/{location_id}")]
    [ProducesResponseType(typeof(PartnerLocationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerLocationDto>> UpdateLocation(
        [FromRoute] int location_id,
        [FromBody] UpdatePartnerLocationDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать в IPartnerDashboardService
            return BadRequestResponse("Обновление локаций будет реализовано в следующей версии");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления локации {LocationId}", location_id);
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Удалить локацию партнера
    /// DELETE /api/v1/partner/locations/{location_id}
    /// </summary>
    [HttpDelete("locations/{location_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteLocation([FromRoute] int location_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать в IPartnerDashboardService
            return BadRequestResponse("Удаление локаций будет реализовано в следующей версии");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления локации {LocationId}", location_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Employees (Update)

    /// <summary>
    /// Обновить сотрудника
    /// PUT /api/v1/partner/employees/{employee_id}
    /// </summary>
    [HttpPut("employees/{employee_id}")]
    [ProducesResponseType(typeof(PartnerEmployeeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerEmployeeDto>> UpdateEmployee(
        [FromRoute] int employee_id,
        [FromBody] UpdatePartnerEmployeeDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            var isOwner = await _partnerService.IsPartnerOwnerAsync(userId.Value, partnerId.Value);
            if (!isOwner)
                return ForbiddenResponse("Только владелец может обновлять сотрудников");

            // TODO: Реализовать в IPartnerDashboardService
            return BadRequestResponse("Обновление сотрудников будет реализовано в следующей версии");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления сотрудника {EmployeeId}", employee_id);
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Users Search

    /// <summary>
    /// Поиск пользователей
    /// GET /api/v1/partner/users/search
    /// </summary>
    [HttpGet("users/search")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> SearchUsers(
        [FromQuery] string? search = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать поиск пользователей
            return Ok(new { items = new List<object>(), total = 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка поиска пользователей");
            return InternalErrorResponse();
        }
    }

    #endregion

    #region Profile

    /// <summary>
    /// Обновить профиль партнера
    /// PUT /api/v1/partner/profile
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(PartnerProfileDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PartnerProfileDto>> UpdateProfile([FromBody] UpdatePartnerProfileDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать обновление профиля
            var profile = await _partnerService.GetPartnerProfileAsync(userId.Value);
            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления профиля");
            return InternalErrorResponse();
        }
    }

    /// <summary>
    /// Загрузить аватар партнера
    /// POST /api/v1/partner/profile/avatar
    /// </summary>
    [HttpPost("profile/avatar")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> UploadAvatar([FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return UnauthorizedResponse();

            var partnerId = await _partnerService.GetPartnerIdForUserAsync(userId.Value);
            if (!partnerId.HasValue)
                return ForbiddenResponse("Пользователь не является партнером");

            // TODO: Реализовать загрузку аватара через IStorageService
            return Ok(new { message = "Загрузка аватара будет реализована в следующей версии" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки аватара");
            return InternalErrorResponse();
        }
    }

    #endregion
}

/// <summary>
/// DTO для обновления статуса заказа партнером
/// </summary>
public class UpdatePartnerOrderStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>
/// DTO для создания локации партнера
/// </summary>
public class CreatePartnerLocationDto
{
    public string? Name { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Phone { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? WorkingHours { get; set; }
}

/// <summary>
/// DTO для обновления локации партнера
/// </summary>
public class UpdatePartnerLocationDto
{
    public string? Name { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? WorkingHours { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO для обновления сотрудника партнера
/// </summary>
public class UpdatePartnerEmployeeDto
{
    public string? Role { get; set; }
    public int? LocationId { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO для обновления профиля партнера
/// </summary>
public class UpdatePartnerProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
