using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;
using YessBackend.Application.DTOs.Notification;
using YessBackend.Application.Services;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер уведомлений (с моками Twilio/Firebase/SendGrid)
/// Соответствует /api/v1/notifications из Python API
/// </summary>
[ApiController]
[Route("api/v1/notifications")]
[Tags("Notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationService notificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Отправка уведомления пользователю
    /// POST /api/v1/notifications/send
    /// </summary>
    [HttpPost("send")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> SendNotification([FromBody] NotificationCreateDto request)
    {
        try
        {
            var result = await _notificationService.SendNotificationAsync(
                request.UserId,
                request.Title,
                request.Message,
                request.NotificationType,
                request.Data);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка отправки уведомления");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Массовая отправка уведомлений
    /// POST /api/v1/notifications/send-bulk
    /// </summary>
    [HttpPost("send-bulk")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> SendBulkNotification([FromBody] BulkNotificationCreateDto request)
    {
        try
        {
            var result = await _notificationService.SendBulkNotificationAsync(
                request.UserIds,
                request.Title,
                request.Message,
                request.NotificationType,
                request.Data);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка массовой отправки уведомлений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получение уведомлений пользователя
    /// GET /api/v1/notifications/user/{user_id}
    /// </summary>
    [HttpGet("user/{user_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> GetUserNotifications(
        [FromRoute] int user_id,
        [FromQuery] int page = 1,
        [FromQuery] int per_page = 20,
        [FromQuery] string? notification_type = null,
        [FromQuery] string? status = null)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var notifications = await _notificationService.GetUserNotificationsAsync(
                user_id, page, per_page, notification_type, status);

            var total = notifications.Count; // Упрощенная версия

            return Ok(new
            {
                notifications = notifications,
                total = total,
                page = page,
                per_page = per_page,
                has_next = notifications.Count == per_page,
                has_prev = page > 1
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уведомлений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Отметить уведомление как прочитанное
    /// PATCH /api/v1/notifications/{notification_id}/read
    /// </summary>
    [HttpPatch("{notification_id}/read")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> MarkNotificationAsRead([FromRoute] int notification_id)
    {
        try
        {
            await _notificationService.MarkNotificationAsReadAsync(notification_id);
            return Ok(new { message = "Notification marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отметки уведомления как прочитанного");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Отметить все уведомления пользователя как прочитанные
    /// PATCH /api/v1/notifications/user/{user_id}/mark-all-read
    /// </summary>
    [HttpPatch("user/{user_id}/mark-all-read")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> MarkAllNotificationsAsRead([FromRoute] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            await _notificationService.MarkAllNotificationsAsReadAsync(user_id);
            return Ok(new { message = "All notifications marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отметки всех уведомлений как прочитанных");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получение количества непрочитанных уведомлений
    /// GET /api/v1/notifications/user/{user_id}/unread-count
    /// </summary>
    [HttpGet("user/{user_id}/unread-count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> GetUnreadCount([FromRoute] int user_id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null || currentUserId.Value != user_id)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var count = await _notificationService.GetUnreadCountAsync(user_id);
            return Ok(new { unread_count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка подсчета непрочитанных уведомлений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Создание шаблона уведомления
    /// POST /api/v1/notifications/templates
    /// </summary>
    [HttpPost("templates")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> CreateNotificationTemplate([FromBody] NotificationTemplateCreateDto request)
    {
        try
        {
            var result = await _notificationService.CreateNotificationTemplateAsync(
                request.Name,
                request.TitleTemplate,
                request.MessageTemplate,
                request.NotificationType,
                request.Variables);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания шаблона уведомления");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Отправка уведомления по шаблону
    /// POST /api/v1/notifications/send-template/{template_id}
    /// </summary>
    [HttpPost("send-template/{template_id}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> SendNotificationFromTemplate(
        [FromRoute] int template_id,
        [FromQuery] int user_id,
        [FromBody] Dictionary<string, string> variables)
    {
        try
        {
            var result = await _notificationService.SendNotificationFromTemplateAsync(
                template_id, user_id, variables);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка отправки уведомления из шаблона");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления из шаблона");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Статистика уведомлений
    /// GET /api/v1/notifications/stats
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> GetNotificationStats()
    {
        try
        {
            var result = await _notificationService.GetNotificationStatsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики уведомлений");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получение уведомлений текущего пользователя
    /// GET /api/v1/notifications/me
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetMyNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int per_page = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            var notifications = await _notificationService.GetUserNotificationsAsync(userId.Value, page, per_page);
            
            return Ok(new
            {
                notifications = notifications,
                total = notifications.Count,
                page = page,
                per_page = per_page
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения уведомлений");
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

