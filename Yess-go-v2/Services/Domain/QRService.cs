using Microsoft.Extensions.Logging;
using YessGoFront.Infrastructure.Exceptions;
using YessGoFront.Services.Api;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Реализация Domain сервиса для работы с QR кодами
/// </summary>
public class QRService : IQRService
{
    private readonly IQRApiService _apiService;
    private readonly ILogger<QRService>? _logger;

    public QRService(
        IQRApiService apiService,
        ILogger<QRService>? logger = null)
    {
        _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
        _logger = logger;
    }

    public async Task<QRResponse> GenerateQRAsync(CancellationToken ct = default)
    {
        try
        {
            _logger?.LogDebug("Generating QR code");
            return await _apiService.GenerateQRAsync(ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error generating QR code");
            throw new NetworkException("Не удалось сгенерировать QR код", ex);
        }
    }

    public async Task<QRValidationResponse> ValidateQRAsync(
        string qrCode,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(qrCode))
                throw new ArgumentException("QR code cannot be empty", nameof(qrCode));

            _logger?.LogDebug("Validating QR code");
            return await _apiService.ValidateQRAsync(qrCode, ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error validating QR code");
            throw new NetworkException("Не удалось проверить QR код", ex);
        }
    }

    public async Task<QRScanResponse> ScanQRAsync(
        string qrCode,
        decimal amount,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(qrCode))
                throw new ArgumentException("QR code cannot be empty", nameof(qrCode));

            if (amount <= 0)
                throw new ArgumentException("Amount must be greater than zero", nameof(amount));

            _logger?.LogInformation("Scanning QR code, amount: {Amount}", amount);
            return await _apiService.ScanQRAsync(qrCode, amount, ct);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error scanning QR code");
            throw new NetworkException("Не удалось отсканировать QR код", ex);
        }
    }
}

