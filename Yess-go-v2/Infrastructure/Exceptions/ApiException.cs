using System;
using System.Net;
using System.Net.Sockets;

namespace YessGoFront.Infrastructure.Exceptions
{
    /// <summary>
    /// Базовое исключение для API ошибок
    /// </summary>
    public class ApiException : Exception
    {
        public HttpStatusCode? StatusCode { get; }
        public string? ErrorCode { get; }
        public object? ErrorDetails { get; }

        public ApiException(
            string message,
            HttpStatusCode? statusCode = null,
            string? errorCode = null,
            object? errorDetails = null)
            : base(message)
        {
            StatusCode = statusCode;
            ErrorCode = errorCode;
            ErrorDetails = errorDetails;
        }

        public ApiException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }

    /// <summary>
    /// Ошибка аутентификации (401)
    /// </summary>
    public class UnauthorizedException : ApiException
    {
        public UnauthorizedException(string message = "Требуется аутентификация")
            : base(message, HttpStatusCode.Unauthorized)
        {
        }
    }

    /// <summary>
    /// Ошибка доступа (403)
    /// </summary>
    public class ForbiddenException : ApiException
    {
        public ForbiddenException(string message = "Доступ запрещён")
            : base(message, HttpStatusCode.Forbidden)
        {
        }
    }

    /// <summary>
    /// Ресурс не найден (404)
    /// </summary>
    public class NotFoundException : ApiException
    {
        public NotFoundException(string message = "Ресурс не найден")
            : base(message, HttpStatusCode.NotFound)
        {
        }
    }

    /// <summary>
    /// Неверный запрос (400)
    /// </summary>
    public class BadRequestException : ApiException
    {
        public BadRequestException(string message = "Неверный запрос", object? errorDetails = null)
            : base(message, HttpStatusCode.BadRequest, errorDetails: errorDetails)
        {
        }
    }

    /// <summary>
    /// Ошибка сервера (500+)
    /// </summary>
    public class ServerException : ApiException
    {
        public ServerException(string message = "Ошибка сервера", HttpStatusCode? statusCode = null)
            : base(message, statusCode ?? HttpStatusCode.InternalServerError)
        {
        }
    }

    /// <summary>
    /// Сетевая ошибка — выбрасывается только при отсутствии соединения, таймауте, DNS, обрыве и т.п.
    /// </summary>
    public class NetworkException : ApiException
    {
        public NetworkException(string message = "Ошибка сети", Exception? innerException = null)
            : base(message, innerException ?? new Exception("Network error"))
        {
        }

        /// <summary>
        /// Проверяет, является ли ошибка сетевой (например, обрыв соединения, таймаут, DNS).
        /// </summary>
        public static bool IsNetworkError(Exception ex)
        {
            return ex is HttpRequestException
                   || ex is SocketException
                   || ex is TaskCanceledException
                   || (ex.InnerException != null && IsNetworkError(ex.InnerException));
        }
    }
}
