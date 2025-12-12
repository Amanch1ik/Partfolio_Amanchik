using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace YessBackend.Api.Controllers;

/// <summary>
/// Базовый контроллер API с общими методами
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// Получить ID текущего пользователя из JWT токена
    /// </summary>
    protected int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }

    /// <summary>
    /// Получить телефон текущего пользователя из JWT токена
    /// </summary>
    protected string? GetCurrentUserPhone()
    {
        return User.FindFirst("phone")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value;
    }

    /// <summary>
    /// Получить роли текущего пользователя
    /// </summary>
    protected IEnumerable<string> GetCurrentUserRoles()
    {
        return User.FindAll(ClaimTypes.Role).Select(c => c.Value);
    }

    /// <summary>
    /// Проверить, есть ли у пользователя указанная роль
    /// </summary>
    protected bool HasRole(string role)
    {
        return User.IsInRole(role);
    }

    /// <summary>
    /// Получить IP адрес клиента
    /// </summary>
    protected string? GetClientIpAddress()
    {
        // Проверяем заголовки прокси
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',').FirstOrDefault()?.Trim();
        }

        var realIp = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    /// <summary>
    /// Получить User-Agent
    /// </summary>
    protected string? GetUserAgent()
    {
        return Request.Headers["User-Agent"].FirstOrDefault();
    }

    /// <summary>
    /// Стандартный ответ об ошибке авторизации
    /// </summary>
    protected ActionResult UnauthorizedResponse(string message = "Неверный токен")
    {
        return Unauthorized(new { error = message });
    }

    /// <summary>
    /// Стандартный ответ о запрете доступа
    /// </summary>
    protected ActionResult ForbiddenResponse(string message = "Доступ запрещен")
    {
        return StatusCode(403, new { error = message });
    }

    /// <summary>
    /// Стандартный ответ "Не найдено"
    /// </summary>
    protected ActionResult NotFoundResponse(string message = "Ресурс не найден")
    {
        return NotFound(new { error = message });
    }

    /// <summary>
    /// Стандартный ответ "Ошибка запроса"
    /// </summary>
    protected ActionResult BadRequestResponse(string message)
    {
        return BadRequest(new { error = message });
    }

    /// <summary>
    /// Стандартный ответ "Внутренняя ошибка сервера"
    /// </summary>
    protected ActionResult InternalErrorResponse(string message = "Внутренняя ошибка сервера")
    {
        return StatusCode(500, new { error = message });
    }
}

