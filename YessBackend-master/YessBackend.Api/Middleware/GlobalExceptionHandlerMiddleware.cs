using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace YessBackend.Api.Middleware;

/// <summary>
/// Глобальный обработчик исключений
/// Соответствует error_handler.py из Python API
/// </summary>
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Исключаем Swagger endpoints из глобального обработчика исключений
        // чтобы видеть реальные ошибки при генерации документации
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.StartsWith("/swagger") || path.StartsWith("/docs"))
        {
            await _next(context);
            return;
        }

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Произошла необработанная ошибка");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        // Специальная обработка ошибок EF Core, чтобы видеть InnerException (ограничения БД и т.д.)
        if (exception is DbUpdateException dbEx && dbEx.InnerException != null)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

            var dbResponse = new
            {
                error = dbEx.InnerException.Message,
                detail = dbEx.InnerException.GetType().Name,
                status_code = (int)HttpStatusCode.BadRequest
            };

            var dbJson = JsonSerializer.Serialize(dbResponse);
            return context.Response.WriteAsync(dbJson);
        }
        
        var statusCode = exception switch
        {
            InvalidOperationException => HttpStatusCode.BadRequest,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            KeyNotFoundException => HttpStatusCode.NotFound,
            _ => HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            error = exception.Message,
            detail = exception.GetType().Name,
            status_code = (int)statusCode
        };

        var json = JsonSerializer.Serialize(response);
        return context.Response.WriteAsync(json);
    }
}

public static class GlobalExceptionHandlerMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<GlobalExceptionHandlerMiddleware>();
    }
}
