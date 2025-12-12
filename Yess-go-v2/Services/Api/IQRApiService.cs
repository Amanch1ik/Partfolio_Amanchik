namespace YessGoFront.Services.Api;

/// <summary>
/// API сервис для работы с QR кодами
/// </summary>
public interface IQRApiService
{
    /// <summary>
    /// Генерировать QR код
    /// </summary>
    Task<QRResponse> GenerateQRAsync(CancellationToken ct = default);

    /// <summary>
    /// Валидировать QR код
    /// </summary>
    Task<QRValidationResponse> ValidateQRAsync(string qrCode, CancellationToken ct = default);

    /// <summary>
    /// Отсканировать QR код (совершить покупку)
    /// </summary>
    Task<QRScanResponse> ScanQRAsync(string qrCode, decimal amount, CancellationToken ct = default);
}

/// <summary>
/// Ответ с QR кодом
/// </summary>
public class QRResponse
{
    public string QRCode { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// Ответ валидации QR кода
/// </summary>
public class QRValidationResponse
{
    public bool IsValid { get; set; }
    public string? PartnerId { get; set; }
    public string? PartnerName { get; set; }
}

/// <summary>
/// Ответ сканирования QR кода
/// </summary>
public class QRScanResponse
{
    public bool Success { get; set; }
    public decimal CashbackAmount { get; set; }
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
}

