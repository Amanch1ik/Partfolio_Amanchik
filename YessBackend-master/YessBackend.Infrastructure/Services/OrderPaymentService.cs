using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.OrderPayment;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис оплаты заказов
/// Реализует логику из Python UnifiedPaymentGateway
/// </summary>
public class OrderPaymentService : IOrderPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<OrderPaymentService> _logger;

    public OrderPaymentService(
        ApplicationDbContext context,
        ILogger<OrderPaymentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PaymentResponseDto> CreateOrderPaymentAsync(int orderId, int userId, OrderPaymentRequestDto request)
    {
        try
        {
            // Получение заказа
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

            if (order == null)
            {
                throw new InvalidOperationException("Заказ не найден");
            }

            if (order.Status != OrderStatus.Pending)
            {
                throw new InvalidOperationException("Заказ уже оплачен или отменен");
            }

            if (order.PaymentStatus == "paid")
            {
                throw new InvalidOperationException("Заказ уже оплачен");
            }

            // Обработка платежа в зависимости от метода
            var transactionId = Guid.NewGuid().ToString();
            var status = "processing";

            // Для wallet - списываем сразу с кошелька
            if (request.Method == Application.DTOs.OrderPayment.PaymentMethod.wallet)
            {
                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                {
                    throw new InvalidOperationException("Кошелек не найден");
                }

                if (wallet.Balance < order.FinalAmount)
                {
                    throw new InvalidOperationException("Недостаточно средств на кошельке");
                }

                // Списываем средства
                wallet.Balance -= order.FinalAmount;
                wallet.LastUpdated = DateTime.UtcNow;

                // Создаем транзакцию
                var transaction = new Transaction
                {
                    UserId = userId,
                    OrderId = orderId,
                    Amount = order.FinalAmount,
                    Type = "payment",
                    Status = "completed",
                    Description = $"Оплата заказа #{orderId}",
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(transaction);

                // Обновляем заказ
                order.PaymentMethod = "wallet";
                order.PaymentStatus = "paid";
                order.Status = OrderStatus.Paid;
                order.PaidAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                status = "success";
            }
            else
            {
                // Для других методов - создаем pending транзакцию
                order.PaymentMethod = request.Method.ToString();
                order.PaymentStatus = "processing";
                await _context.SaveChangesAsync();
            }

            return new PaymentResponseDto
            {
                OrderId = orderId,
                TransactionId = transactionId,
                Status = status,
                Amount = order.FinalAmount,
                Commission = 0,
                Message = status == "success" ? "Платеж успешно обработан" : "Платеж создан"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания платежа заказа");
            throw;
        }
    }

    public async Task<PaymentStatusResponseDto> GetPaymentStatusAsync(int orderId, int userId)
    {
        try
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

            if (order == null)
            {
                throw new InvalidOperationException("Заказ не найден");
            }

            return new PaymentStatusResponseDto
            {
                OrderId = orderId,
                PaymentStatus = order.PaymentStatus,
                OrderStatus = order.Status.ToString(),
                Amount = order.FinalAmount,
                PaidAt = order.PaidAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статуса платежа");
            throw;
        }
    }
}

