using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using YessBackend.Application.DTOs.Order;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис заказов
/// Реализует логику из Python OrderService
/// </summary>
public class OrderService : IOrderService
{
    private readonly ApplicationDbContext _context;

    public OrderService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderCalculateResponseDto> CalculateOrderAsync(
        int partnerId,
        List<OrderItemDto> items,
        int? userId = null)
    {
        var partner = await _context.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId);

        if (partner == null)
        {
            throw new InvalidOperationException("Партнер не найден");
        }

        if (!partner.IsActive)
        {
            throw new InvalidOperationException("Партнер неактивен");
        }

        decimal orderTotal = 0;
        var orderItemsData = new List<object>();

        // Расчет суммы товаров
        foreach (var item in items)
        {
            var product = await _context.PartnerProducts
                .FirstOrDefaultAsync(p =>
                    p.Id == item.ProductId &&
                    p.PartnerId == partnerId &&
                    p.IsAvailable);

            if (product == null)
            {
                throw new InvalidOperationException($"Товар {item.ProductId} не найден или недоступен");
            }

            // Проверка наличия
            if (product.StockQuantity.HasValue && product.StockQuantity.Value < item.Quantity)
            {
                throw new InvalidOperationException(
                    $"Недостаточно товара {product.Name}. Доступно: {product.StockQuantity}");
            }

            // Расчет цены с учетом скидки
            var price = product.Price;
            if (product.DiscountPercent > 0)
            {
                price = price * (1 - product.DiscountPercent / 100);
            }

            var subtotal = price * item.Quantity;
            orderTotal += subtotal;

            orderItemsData.Add(new
            {
                Product = product,
                Quantity = item.Quantity,
                Price = price,
                Subtotal = subtotal,
                Notes = item.Notes
            });
        }

        // Расчет скидки (максимальная скидка партнера)
        var maxDiscount = orderTotal * (partner.MaxDiscountPercent / 100);
        var discount = 0.0m; // Пока без скидки, можно добавить логику промокодов

        // Расчет кэшбэка
        var cashbackRate = partner.CashbackRate > 0 ? partner.CashbackRate : partner.DefaultCashbackRate;
        if (cashbackRate == 0) cashbackRate = 5.0m; // По умолчанию 5%
        var cashbackAmount = orderTotal * (cashbackRate / 100);

        // Итоговая сумма
        var finalAmount = orderTotal - discount;

        // Получение баланса пользователя (если указан)
        decimal? userBalance = null;
        if (userId.HasValue)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId.Value);
            userBalance = wallet?.Balance;
        }

        return new OrderCalculateResponseDto
        {
            OrderTotal = orderTotal,
            Discount = discount,
            CashbackAmount = cashbackAmount,
            FinalAmount = finalAmount,
            MaxDiscount = maxDiscount,
            UserBalance = userBalance
        };
    }

    public async Task<Order> CreateOrderAsync(
        int userId,
        OrderCreateRequestDto orderRequest)
    {
        // Генерация idempotency key если не указан
        var idempotencyKey = orderRequest.IdempotencyKey ?? GenerateIdempotencyKey(
            userId, orderRequest.PartnerId, orderRequest.Items);

        // Проверка идемпотентности
        var existingOrder = await _context.Orders
            .FirstOrDefaultAsync(o => o.IdempotencyKey == idempotencyKey);

        if (existingOrder != null)
        {
            return existingOrder;
        }

        // Расчет заказа
        var calculation = await CalculateOrderAsync(
            orderRequest.PartnerId,
            orderRequest.Items,
            userId);

        // Создание заказа
        var order = new Order
        {
            UserId = userId,
            PartnerId = orderRequest.PartnerId,
            OrderTotal = calculation.OrderTotal,
            Discount = calculation.Discount,
            CashbackAmount = calculation.CashbackAmount,
            FinalAmount = calculation.FinalAmount,
            Status = OrderStatus.Pending,
            DeliveryAddress = orderRequest.DeliveryAddress,
            DeliveryType = orderRequest.DeliveryType ?? "pickup",
            DeliveryNotes = orderRequest.DeliveryNotes,
            PaymentStatus = "pending",
            IdempotencyKey = idempotencyKey,
            CreatedAt = DateTime.UtcNow
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Создание элементов заказа
        foreach (var item in orderRequest.Items)
        {
            var product = await _context.PartnerProducts
                .FirstOrDefaultAsync(p => p.Id == item.ProductId);

            if (product == null) continue;

            var price = product.Price;
            if (product.DiscountPercent > 0)
            {
                price = price * (1 - product.DiscountPercent / 100);
            }

            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                ProductPrice = price,
                Quantity = item.Quantity,
                Subtotal = price * item.Quantity,
                Notes = item.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _context.OrderItems.Add(orderItem);

            // Обновление остатков
            if (product.StockQuantity.HasValue)
            {
                product.StockQuantity -= item.Quantity;
            }
        }

        await _context.SaveChangesAsync();

        // Загружаем связанные данные
        await _context.Entry(order)
            .Collection(o => o.Items)
            .LoadAsync();

        return order;
    }

    public async Task<Order?> GetOrderByIdAsync(int orderId, int? userId = null)
    {
        var query = _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Partner)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(o => o.UserId == userId.Value);
        }

        return await query.FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<List<Order>> GetUserOrdersAsync(int userId, int limit = 20, int offset = 0)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Partner)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public string GenerateIdempotencyKey(int userId, int partnerId, List<OrderItemDto> items)
    {
        var sortedItems = items.OrderBy(i => i.ProductId)
            .Select(i => $"{i.ProductId}:{i.Quantity}");
        var itemsStr = string.Join(",", sortedItems);
        var data = $"{userId}:{partnerId}:{itemsStr}:{DateTime.UtcNow:O}";
        
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
