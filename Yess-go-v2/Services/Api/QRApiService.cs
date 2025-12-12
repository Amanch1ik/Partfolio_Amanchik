using Microsoft.Extensions.Logging;
using YessGoFront.Config;
using YessGoFront.Infrastructure.Http;

namespace YessGoFront.Services.Api;

/// <summary>
/// Реализация API сервиса для работы с QR кодами
/// </summary>
public class QRApiService : ApiClient, IQRApiService
{
    public QRApiService(
        HttpClient httpClient,
        ILogger<QRApiService>? logger = null)
        : base(httpClient, logger)
    {
    }

    public async Task<QRResponse> GenerateQRAsync(CancellationToken ct = default)
    {
        return await PostAsync<object, QRResponse>(
            ApiEndpoints.QREndpoints.Generate, new { }, ct);
    }

    public async Task<QRValidationResponse> ValidateQRAsync(
        string qrCode,
        CancellationToken ct = default)
    {
        var request = new { qrCode };
        return await PostAsync<object, QRValidationResponse>(
            ApiEndpoints.QREndpoints.Validate, request, ct);
    }

    public async Task<QRScanResponse> ScanQRAsync(
        string qrCode,
        decimal amount,
        CancellationToken ct = default)
    {
        var request = new { qrCode, amount };
        return await PostAsync<object, QRScanResponse>(
            ApiEndpoints.QREndpoints.Scan, request, ct);
    }
}

