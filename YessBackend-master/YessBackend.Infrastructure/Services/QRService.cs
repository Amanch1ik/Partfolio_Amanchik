using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.QR;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис работы с QR кодами
/// Реализует логику из Python QRService
/// </summary>
public class QRService : IQRService
{
    private readonly ApplicationDbContext _context;
    private readonly IStorageService _storageService;
    private readonly ILogger<QRService> _logger;

    public QRService(
        ApplicationDbContext context,
        IStorageService storageService,
        ILogger<QRService> logger)
    {
        _context = context;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<QRScanResponseDto> ScanQRCodeAsync(int userId, QRScanRequestDto request)
    {
        try
        {
            // Парсим QR код (ожидаем JSON формат)
            Dictionary<string, object>? qrData;
            try
            {
                qrData = JsonSerializer.Deserialize<Dictionary<string, object>>(request.QrData);
            }
            catch
            {
                // Fallback: пробуем парсить как простую строку вида "partner:1:..."
                qrData = ParseSimpleQRData(request.QrData);
            }

            if (qrData == null || !qrData.ContainsKey("partner_id"))
            {
                throw new InvalidOperationException("Неверный формат QR кода");
            }

            var partnerId = Convert.ToInt32(qrData["partner_id"].ToString());

            // Получаем партнера
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partnerId && p.IsActive);

            if (partner == null)
            {
                throw new InvalidOperationException("Партнер не найден или неактивен");
            }

            // Получаем баланс пользователя
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null)
            {
                throw new InvalidOperationException("Кошелек не найден");
            }

            return new QRScanResponseDto
            {
                PartnerId = partner.Id,
                PartnerName = partner.Name,
                PartnerCategory = partner.Category ?? "Разное",
                PartnerLogo = partner.LogoUrl,
                MaxDiscount = partner.MaxDiscountPercent,
                CashbackRate = partner.CashbackRate,
                UserBalance = wallet.YescoinBalance,
                Message = $"Отсканирован QR код партнёра: {partner.Name}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка сканирования QR кода");
            throw;
        }
    }

    public async Task<QRPaymentResponseDto> PayWithQRAsync(int userId, QRPaymentRequestDto request)
    {
        try
        {
            // Валидация суммы
            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Сумма должна быть больше 0");
            }

            // Получаем партнера
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == request.PartnerId && p.IsActive);

            if (partner == null)
            {
                throw new InvalidOperationException("Партнер не найден или неактивен");
            }

            // Получаем кошелек
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null)
            {
                throw new InvalidOperationException("Кошелек не найден");
            }

            // Рассчитываем скидку
            var discountPercent = partner.MaxDiscountPercent;
            var discountAmount = request.Amount * (discountPercent / 100);

            // Итоговая сумма к списанию
            var finalAmount = request.Amount - discountAmount;

            // Проверка баланса
            if (wallet.YescoinBalance < finalAmount)
            {
                throw new InvalidOperationException(
                    $"Недостаточно средств. Требуется: {finalAmount} YesCoin, Доступно: {wallet.YescoinBalance}");
            }

            // Списываем баллы
            wallet.YescoinBalance -= finalAmount;

            // Рассчитываем и начисляем кэшбэк
            var cashbackPercent = partner.CashbackRate;
            var cashbackAmount = finalAmount * (cashbackPercent / 100);
            wallet.YescoinBalance += cashbackAmount;

            wallet.LastUpdated = DateTime.UtcNow;

            // Создаем транзакцию
            var transaction = new Transaction
            {
                UserId = userId,
                PartnerId = partner.Id,
                Amount = request.Amount,
                YescoinUsed = finalAmount,
                YescoinEarned = cashbackAmount,
                Type = "payment",
                Status = "completed",
                BalanceBefore = wallet.YescoinBalance - cashbackAmount + finalAmount,
                BalanceAfter = wallet.YescoinBalance,
                Description = $"Оплата в {partner.Name}",
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Payment completed: User {UserId} paid {Amount} YesCoin to Partner {PartnerId}, earned {Cashback} cashback",
                userId, finalAmount, partner.Id, cashbackAmount);

            return new QRPaymentResponseDto
            {
                Success = true,
                TransactionId = transaction.Id,
                AmountCharged = finalAmount,
                DiscountApplied = discountAmount,
                CashbackEarned = cashbackAmount,
                NewBalance = wallet.YescoinBalance,
                PartnerName = partner.Name
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка оплаты через QR код");
            throw;
        }
    }

    public async Task<QRGenerateResponseDto> GeneratePartnerQRAsync(int partnerId)
    {
        try
        {
            // Получаем партнера
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partnerId);

            if (partner == null)
            {
                throw new InvalidOperationException("Партнер не найден");
            }

            // Данные для QR кода
            var qrData = new
            {
                type = "partner_payment",
                partner_id = partnerId,
                partner_name = partner.Name,
                version = "1.0",
                timestamp = DateTime.UtcNow.ToString("O")
            };

            // Сериализуем в JSON
            var dataString = JsonSerializer.Serialize(qrData);

            // TODO: Использовать QRCoder для генерации QR кода
            // Пока генерируем mock URL
            var qrCodeUrl = $"https://storage.example.com/qrcodes/partner_{partnerId}_qr.png";

            // Сохраняем URL в базе (если есть поле qr_code_url)
            // partner.QrCodeUrl = qrCodeUrl;
            // await _context.SaveChangesAsync();

            _logger.LogInformation("QR code generated for partner {PartnerId}: {Url}", partnerId, qrCodeUrl);

            return new QRGenerateResponseDto
            {
                Success = true,
                PartnerId = partnerId,
                QrCodeUrl = qrCodeUrl,
                Message = "QR code generated successfully (mock)"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка генерации QR кода");
            throw;
        }
    }

    private Dictionary<string, object>? ParseSimpleQRData(string qrData)
    {
        // Парсинг простого формата "partner:1:timestamp:12345"
        var parts = qrData.Split(':');
        if (parts.Length >= 2 && parts[0] == "partner")
        {
            if (int.TryParse(parts[1], out var partnerId))
            {
                return new Dictionary<string, object>
                {
                    { "partner_id", partnerId },
                    { "type", "partner_payment" }
                };
            }
        }
        return null;
    }
}

