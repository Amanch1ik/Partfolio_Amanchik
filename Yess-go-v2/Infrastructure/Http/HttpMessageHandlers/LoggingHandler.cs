using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace YessGoFront.Infrastructure.Http.HttpMessageHandlers
{
    /// <summary>
    /// HTTP Handler для логирования запросов и ответов
    /// </summary>
    public class LoggingHandler : DelegatingHandler
    {
        private readonly ILogger<LoggingHandler>? _logger;

        public LoggingHandler(ILogger<LoggingHandler>? logger = null)
        {
            _logger = logger;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (_logger == null)
                return await base.SendAsync(request, cancellationToken);

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            _logger.LogInformation("➡️ HTTP {Method} {Url}",
                request.Method, request.RequestUri);

            // Логируем тело запроса, если оно есть
            // Все запросы теперь используют JSON, поэтому можно безопасно читать тело
            if (request.Content != null)
            {
                try
                {
                    var requestBody = await request.Content.ReadAsStringAsync();
                    if (!string.IsNullOrWhiteSpace(requestBody))
                        _logger.LogInformation("📤 Request Body: {Body}", requestBody);
                }
                catch
                {
                    // Игнорируем ошибки чтения тела запроса
                }
            }

            try
            {
                var response = await base.SendAsync(request, cancellationToken);
                stopwatch.Stop();

                // Логируем ответ
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("✅ HTTP {Method} {Url} - {StatusCode} ({ElapsedMs}ms)",
                    request.Method, request.RequestUri,
                    (int)response.StatusCode, stopwatch.ElapsedMilliseconds);

                if (!string.IsNullOrWhiteSpace(responseBody))
                    _logger.LogInformation("📥 Response Body: {Body}", responseBody);

                return response;
            }
            catch (HttpRequestException httpEx)
            {
                stopwatch.Stop();
                _logger.LogError(httpEx,
                    "❌ HTTP Request Error {Method} {Url} after {ElapsedMs}ms: {Message}",
                    request.Method, request.RequestUri, stopwatch.ElapsedMilliseconds, httpEx.Message);
                throw;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex,
                    "💥 Unexpected Error {Method} {Url} after {ElapsedMs}ms: {Message}",
                    request.Method, request.RequestUri, stopwatch.ElapsedMilliseconds, ex.Message);
                throw;
            }
        }
    }
}
