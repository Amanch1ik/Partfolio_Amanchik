using YessGoFront.Services.Api;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Domain сервис для работы с QR кодами (бизнес-логика)
/// </summary>
public interface IQRService
{
    Task<QRResponse> GenerateQRAsync(CancellationToken ct = default);
    Task<QRValidationResponse> ValidateQRAsync(string qrCode, CancellationToken ct = default);
    Task<QRScanResponse> ScanQRAsync(string qrCode, decimal amount, CancellationToken ct = default);
}

