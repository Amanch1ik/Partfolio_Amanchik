using YessBackend.Application.DTOs.QR;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса работы с QR кодами
/// </summary>
public interface IQRService
{
    Task<QRScanResponseDto> ScanQRCodeAsync(int userId, QRScanRequestDto request);
    Task<QRPaymentResponseDto> PayWithQRAsync(int userId, QRPaymentRequestDto request);
    Task<QRGenerateResponseDto> GeneratePartnerQRAsync(int partnerId);
}

