using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.PartnerDashboard;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис панели партнера
/// </summary>
public class PartnerDashboardService : IPartnerDashboardService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PartnerDashboardService> _logger;

    public PartnerDashboardService(
        ApplicationDbContext context,
        ILogger<PartnerDashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Authentication & Profile

    public async Task<int?> GetPartnerIdForUserAsync(int userId)
    {
        // Проверяем, является ли пользователь владельцем партнера
        var ownedPartner = await _context.Partners
            .FirstOrDefaultAsync(p => p.OwnerId == userId);

        if (ownedPartner != null)
            return ownedPartner.Id;

        // Проверяем, является ли пользователь сотрудником
        var employee = await _context.PartnerEmployees
            .FirstOrDefaultAsync(e => e.UserId == userId);

        return employee?.PartnerId;
    }

    public async Task<PartnerProfileDto?> GetPartnerProfileAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return null;

        var partnerId = await GetPartnerIdForUserAsync(userId);
        if (!partnerId.HasValue) return null;

        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId.Value);
        if (partner == null) return null;

        var isOwner = partner.OwnerId == userId;
        var employee = !isOwner 
            ? await _context.PartnerEmployees.FirstOrDefaultAsync(e => e.UserId == userId && e.PartnerId == partnerId)
            : null;

        var permissions = GetPermissionsForPartnerRole(isOwner, employee?.Role);

        return new PartnerProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Phone = user.Phone,
            Username = user.FirstName ?? "Partner",
            Name = !string.IsNullOrWhiteSpace($"{user.FirstName} {user.LastName}".Trim())
                ? $"{user.FirstName} {user.LastName}".Trim()
                : "Partner",
            FirstName = user.FirstName,
            LastName = user.LastName,
            AvatarUrl = user.AvatarUrl,
            Role = isOwner ? "owner" : (employee?.Role ?? "employee"),
            PartnerId = partner.Id,
            PartnerName = partner.Name,
            PartnerLogoUrl = partner.LogoUrl,
            IsOwner = isOwner,
            Permissions = permissions
        };
    }

    public async Task<bool> IsPartnerOrEmployeeAsync(int userId)
    {
        var partnerId = await GetPartnerIdForUserAsync(userId);
        return partnerId.HasValue;
    }

    public async Task<bool> IsPartnerOwnerAsync(int userId, int partnerId)
    {
        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId);
        return partner?.OwnerId == userId;
    }

    #endregion

    #region Dashboard & Statistics

    public async Task<PartnerStatsDto?> GetPartnerStatsAsync(int partnerId)
    {
        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId);
        if (partner == null) return null;

        var now = DateTime.UtcNow;
        var today = now.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var lastMonthStart = monthStart.AddMonths(-1);

        // Заказы
        var ordersQuery = _context.Orders.Where(o => o.PartnerId == partnerId);
        var totalOrders = await ordersQuery.CountAsync();
        var pendingOrders = await ordersQuery.CountAsync(o => o.Status == OrderStatus.Pending);
        var completedOrders = await ordersQuery.CountAsync(o => o.Status == OrderStatus.Completed);
        var cancelledOrders = await ordersQuery.CountAsync(o => o.Status == OrderStatus.Cancelled);
        var ordersToday = await ordersQuery.CountAsync(o => o.CreatedAt >= today);
        var ordersThisWeek = await ordersQuery.CountAsync(o => o.CreatedAt >= weekStart);
        var ordersThisMonth = await ordersQuery.CountAsync(o => o.CreatedAt >= monthStart);

        // Транзакции
        var transactionsQuery = _context.Transactions.Where(t => t.PartnerId == partnerId);
        var totalTransactions = await transactionsQuery.CountAsync();
        var transactionsToday = await transactionsQuery.CountAsync(t => t.CreatedAt >= today);

        // Выручка
        var completedTransactions = transactionsQuery.Where(t => t.Status == "completed");
        var totalRevenue = await completedTransactions.SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revenueToday = await completedTransactions.Where(t => t.CreatedAt >= today).SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revenueThisWeek = await completedTransactions.Where(t => t.CreatedAt >= weekStart).SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revenueThisMonth = await completedTransactions.Where(t => t.CreatedAt >= monthStart).SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revenueLastMonth = await completedTransactions.Where(t => t.CreatedAt >= lastMonthStart && t.CreatedAt < monthStart).SumAsync(t => (decimal?)t.Amount) ?? 0;

        // Рост выручки
        var revenueGrowth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;

        // Средний чек
        var averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

        // Клиенты
        var uniqueCustomers = await ordersQuery.Select(o => o.UserId).Distinct().CountAsync();
        var newCustomersThisMonth = await ordersQuery
            .Where(o => o.CreatedAt >= monthStart)
            .Select(o => o.UserId)
            .Distinct()
            .CountAsync();

        var returningCustomers = await _context.Orders
            .Where(o => o.PartnerId == partnerId)
            .GroupBy(o => o.UserId)
            .Where(g => g.Count() > 1)
            .CountAsync();

        // Продукты
        var productsQuery = _context.PartnerProducts.Where(p => p.PartnerId == partnerId);
        var productsCount = await productsQuery.CountAsync();
        var activeProducts = await productsQuery.CountAsync(p => p.IsActive);

        // Локации
        var locationsCount = await _context.PartnerLocations.CountAsync(l => l.PartnerId == partnerId);

        // Сотрудники
        var employeesCount = await _context.PartnerEmployees.CountAsync(e => e.PartnerId == partnerId);

        // Кэшбэк
        var totalCashbackGiven = await ordersQuery.SumAsync(o => (decimal?)o.CashbackAmount) ?? 0;

        return new PartnerStatsDto
        {
            PartnerId = partnerId,
            PartnerName = partner.Name,
            TotalOrders = totalOrders,
            PendingOrders = pendingOrders,
            CompletedOrders = completedOrders,
            CancelledOrders = cancelledOrders,
            OrdersToday = ordersToday,
            OrdersThisWeek = ordersThisWeek,
            OrdersThisMonth = ordersThisMonth,
            TotalTransactions = totalTransactions,
            TransactionsToday = transactionsToday,
            TotalRevenue = totalRevenue,
            RevenueToday = revenueToday,
            RevenueThisWeek = revenueThisWeek,
            RevenueThisMonth = revenueThisMonth,
            RevenueGrowthPercent = revenueGrowth,
            AverageOrderValue = averageOrderValue,
            UniqueCustomers = uniqueCustomers,
            NewCustomersThisMonth = newCustomersThisMonth,
            ReturningCustomers = returningCustomers,
            ProductsCount = productsCount,
            ActiveProducts = activeProducts,
            LocationsCount = locationsCount,
            EmployeesCount = employeesCount,
            TotalCashbackGiven = totalCashbackGiven,
            CashbackRate = partner.CashbackRate
        };
    }

    public async Task<PartnerChartsDto> GetPartnerChartsAsync(int partnerId, int days = 30)
    {
        var endDate = DateTime.UtcNow.Date.AddDays(1);
        var startDate = endDate.AddDays(-days);

        var charts = new PartnerChartsDto();

        // Revenue chart
        var revenueData = await _context.Transactions
            .Where(t => t.PartnerId == partnerId && t.Status == "completed" && t.CreatedAt >= startDate && t.CreatedAt < endDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Value = g.Sum(t => t.Amount) })
            .OrderBy(x => x.Date)
            .ToListAsync();

        charts.RevenueChart = revenueData.Select(x => new PartnerChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Orders chart
        var ordersData = await _context.Orders
            .Where(o => o.PartnerId == partnerId && o.CreatedAt >= startDate && o.CreatedAt < endDate)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Value = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        charts.OrdersChart = ordersData.Select(x => new PartnerChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Customers chart
        var customersData = await _context.Orders
            .Where(o => o.PartnerId == partnerId && o.CreatedAt >= startDate && o.CreatedAt < endDate)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Value = g.Select(o => o.UserId).Distinct().Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        charts.CustomersChart = customersData.Select(x => new PartnerChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Top products (by sales)
        // Note: This requires joining with OrderItems
        var topProducts = await _context.PartnerProducts
            .Where(p => p.PartnerId == partnerId)
            .OrderByDescending(p => p.Id) // Placeholder - ideally would sort by sales
            .Take(5)
            .Select(p => new TopProductDto
            {
                Id = p.Id,
                Name = p.Name,
                SalesCount = 0, // Would need OrderItems aggregation
                Revenue = 0,
                ImageUrl = p.ImageUrl
            })
            .ToListAsync();

        charts.TopProducts = topProducts;

        // Orders by status
        var totalOrders = await _context.Orders.CountAsync(o => o.PartnerId == partnerId);
        var ordersByStatus = await _context.Orders
            .Where(o => o.PartnerId == partnerId)
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        charts.OrdersByStatus = ordersByStatus.Select(x => new StatusChartDto
        {
            Status = x.Status.ToString(),
            Count = x.Count,
            Percentage = totalOrders > 0 ? (decimal)x.Count / totalOrders * 100 : 0
        }).ToList();

        // Revenue by location
        var revenueByLocation = await _context.Orders
            .Where(o => o.PartnerId == partnerId && o.LocationId.HasValue)
            .GroupBy(o => o.LocationId)
            .Select(g => new
            {
                LocationId = g.Key,
                Revenue = g.Sum(o => o.FinalAmount),
                OrdersCount = g.Count()
            })
            .ToListAsync();

        var locations = await _context.PartnerLocations
            .Where(l => l.PartnerId == partnerId)
            .ToDictionaryAsync(l => l.Id, l => new { l.Name, l.Address });

        charts.RevenueByLocation = revenueByLocation
            .Where(x => x.LocationId.HasValue && locations.ContainsKey(x.LocationId.Value))
            .Select(x => new LocationRevenueDto
            {
                LocationId = x.LocationId!.Value,
                LocationName = locations[x.LocationId.Value].Name ?? $"Location {x.LocationId}",
                Address = locations[x.LocationId.Value].Address,
                Revenue = x.Revenue,
                OrdersCount = x.OrdersCount
            }).ToList();

        return charts;
    }

    #endregion

    #region Transactions

    public async Task<PartnerPaginatedResponseDto<PartnerTransactionDto>> GetTransactionsAsync(
        int partnerId,
        PartnerTransactionFilterDto filter,
        int limit = 50,
        int offset = 0)
    {
        var query = _context.Transactions
            .Include(t => t.User)
            .Where(t => t.PartnerId == partnerId)
            .AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(t =>
                (t.Description != null && t.Description.ToLower().Contains(search)) ||
                (t.User != null && t.User.Phone.ToLower().Contains(search)));
        }

        if (!string.IsNullOrEmpty(filter.Type))
            query = query.Where(t => t.Type == filter.Type);

        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(t => t.Status == filter.Status);

        if (filter.MinAmount.HasValue)
            query = query.Where(t => t.Amount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(t => t.Amount <= filter.MaxAmount.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(t => t.CreatedAt >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(t => t.CreatedAt <= filter.DateTo.Value);

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "amount" => filter.SortDesc ? query.OrderByDescending(t => t.Amount) : query.OrderBy(t => t.Amount),
            "status" => filter.SortDesc ? query.OrderByDescending(t => t.Status) : query.OrderBy(t => t.Status),
            _ => filter.SortDesc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };

        var total = await query.CountAsync();
        var transactions = await query.Skip(offset).Take(limit).ToListAsync();

        var items = transactions.Select(t => new PartnerTransactionDto
        {
            Id = t.Id,
            UserId = t.UserId,
            UserName = t.User != null ? $"{t.User.FirstName} {t.User.LastName}".Trim() : null,
            UserPhone = t.User?.Phone,
            Amount = t.Amount,
            Type = t.Type ?? string.Empty,
            Status = t.Status ?? string.Empty,
            Description = t.Description,
            CreatedAt = t.CreatedAt,
            CompletedAt = t.CompletedAt
        }).ToList();

        return new PartnerPaginatedResponseDto<PartnerTransactionDto>
        {
            Items = items,
            Total = total,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<PartnerTransactionDto?> GetTransactionByIdAsync(int partnerId, int transactionId)
    {
        var t = await _context.Transactions
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.PartnerId == partnerId);

        if (t == null) return null;

        return new PartnerTransactionDto
        {
            Id = t.Id,
            UserId = t.UserId,
            UserName = t.User != null ? $"{t.User.FirstName} {t.User.LastName}".Trim() : null,
            UserPhone = t.User?.Phone,
            Amount = t.Amount,
            Type = t.Type ?? string.Empty,
            Status = t.Status ?? string.Empty,
            Description = t.Description,
            CreatedAt = t.CreatedAt,
            CompletedAt = t.CompletedAt
        };
    }

    #endregion

    #region Orders

    public async Task<PartnerPaginatedResponseDto<PartnerOrderDto>> GetOrdersAsync(
        int partnerId,
        PartnerOrderFilterDto filter,
        int limit = 50,
        int offset = 0)
    {
        var query = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Items)
            .Where(o => o.PartnerId == partnerId)
            .AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(o =>
                (o.User != null && o.User.Phone.ToLower().Contains(search)) ||
                (o.Notes != null && o.Notes.ToLower().Contains(search)));
        }

        if (!string.IsNullOrEmpty(filter.Status))
        {
            if (Enum.TryParse<OrderStatus>(filter.Status, true, out var status))
                query = query.Where(o => o.Status == status);
        }

        if (filter.LocationId.HasValue)
            query = query.Where(o => o.LocationId == filter.LocationId.Value);

        if (filter.MinAmount.HasValue)
            query = query.Where(o => o.FinalAmount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(o => o.FinalAmount <= filter.MaxAmount.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(o => o.CreatedAt >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(o => o.CreatedAt <= filter.DateTo.Value);

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "amount" => filter.SortDesc ? query.OrderByDescending(o => o.FinalAmount) : query.OrderBy(o => o.FinalAmount),
            "status" => filter.SortDesc ? query.OrderByDescending(o => o.Status) : query.OrderBy(o => o.Status),
            _ => filter.SortDesc ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt)
        };

        var total = await query.CountAsync();
        var orders = await query.Skip(offset).Take(limit).ToListAsync();

        // Get locations
        var locationIds = orders.Where(o => o.LocationId.HasValue).Select(o => o.LocationId!.Value).Distinct();
        var locations = await _context.PartnerLocations
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name ?? l.Address);

        var items = orders.Select(o => new PartnerOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : null,
            UserPhone = o.User?.Phone,
            LocationId = o.LocationId,
            LocationName = o.LocationId.HasValue && locations.ContainsKey(o.LocationId.Value) 
                ? locations[o.LocationId.Value] 
                : null,
            OriginalAmount = o.OriginalAmount,
            DiscountAmount = o.DiscountAmount,
            CashbackAmount = o.CashbackAmount,
            FinalAmount = o.FinalAmount,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus,
            ItemsCount = o.Items?.Count ?? 0,
            Items = o.Items?.Select(i => new PartnerOrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList() ?? new List<PartnerOrderItemDto>(),
            Notes = o.Notes,
            CreatedAt = o.CreatedAt
        }).ToList();

        return new PartnerPaginatedResponseDto<PartnerOrderDto>
        {
            Items = items,
            Total = total,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<PartnerOrderDto?> GetOrderByIdAsync(int partnerId, int orderId)
    {
        var o = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.PartnerId == partnerId);

        if (o == null) return null;

        string? locationName = null;
        if (o.LocationId.HasValue)
        {
            var location = await _context.PartnerLocations.FirstOrDefaultAsync(l => l.Id == o.LocationId.Value);
            locationName = location?.Name ?? location?.Address;
        }

        return new PartnerOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : null,
            UserPhone = o.User?.Phone,
            LocationId = o.LocationId,
            LocationName = locationName,
            OriginalAmount = o.OriginalAmount,
            DiscountAmount = o.DiscountAmount,
            CashbackAmount = o.CashbackAmount,
            FinalAmount = o.FinalAmount,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus,
            ItemsCount = o.Items?.Count ?? 0,
            Items = o.Items?.Select(i => new PartnerOrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList() ?? new List<PartnerOrderItemDto>(),
            Notes = o.Notes,
            CreatedAt = o.CreatedAt
        };
    }

    public async Task<bool> UpdateOrderStatusAsync(int partnerId, int orderId, string status, string? notes = null)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.PartnerId == partnerId);
        if (order == null) return false;

        if (Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
        {
            order.Status = orderStatus;
            if (!string.IsNullOrEmpty(notes))
                order.Notes = notes;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Partner {PartnerId} updated order {OrderId} status to {Status}", partnerId, orderId, status);
            return true;
        }

        return false;
    }

    #endregion

    #region Products

    public async Task<PartnerPaginatedResponseDto<PartnerProductDto>> GetProductsAsync(
        int partnerId,
        string? search = null,
        string? category = null,
        bool? isActive = null,
        int limit = 50,
        int offset = 0)
    {
        var query = _context.PartnerProducts
            .Where(p => p.PartnerId == partnerId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(searchLower) ||
                                    (p.Description != null && p.Description.ToLower().Contains(searchLower)));
        }

        if (!string.IsNullOrEmpty(category))
            query = query.Where(p => p.Category == category);

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var total = await query.CountAsync();
        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var items = products.Select(p => new PartnerProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            Category = p.Category,
            Price = p.Price,
            DiscountPrice = p.DiscountPrice,
            ImageUrl = p.ImageUrl,
            IsActive = p.IsActive,
            IsFeatured = p.IsFeatured,
            StockQuantity = p.StockQuantity,
            Sku = p.Sku,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        }).ToList();

        return new PartnerPaginatedResponseDto<PartnerProductDto>
        {
            Items = items,
            Total = total,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<PartnerProductDto?> GetProductByIdAsync(int partnerId, int productId)
    {
        var p = await _context.PartnerProducts
            .FirstOrDefaultAsync(p => p.Id == productId && p.PartnerId == partnerId);

        if (p == null) return null;

        return new PartnerProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            Category = p.Category,
            Price = p.Price,
            DiscountPrice = p.DiscountPrice,
            ImageUrl = p.ImageUrl,
            IsActive = p.IsActive,
            IsFeatured = p.IsFeatured,
            StockQuantity = p.StockQuantity,
            Sku = p.Sku,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

    public async Task<PartnerProductDto> CreateProductAsync(int partnerId, PartnerProductRequestDto request)
    {
        var product = new PartnerProduct
        {
            PartnerId = partnerId,
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Price = request.Price,
            DiscountPrice = request.DiscountPrice,
            ImageUrl = request.ImageUrl,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            StockQuantity = request.StockQuantity,
            Sku = request.Sku,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.PartnerProducts.Add(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Partner {PartnerId} created product {ProductId}", partnerId, product.Id);

        return (await GetProductByIdAsync(partnerId, product.Id))!;
    }

    public async Task<PartnerProductDto?> UpdateProductAsync(int partnerId, int productId, PartnerProductRequestDto request)
    {
        var product = await _context.PartnerProducts
            .FirstOrDefaultAsync(p => p.Id == productId && p.PartnerId == partnerId);

        if (product == null) return null;

        product.Name = request.Name;
        product.Description = request.Description;
        product.Category = request.Category;
        product.Price = request.Price;
        product.DiscountPrice = request.DiscountPrice;
        product.ImageUrl = request.ImageUrl;
        product.IsActive = request.IsActive;
        product.IsFeatured = request.IsFeatured;
        product.StockQuantity = request.StockQuantity;
        product.Sku = request.Sku;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Partner {PartnerId} updated product {ProductId}", partnerId, productId);

        return await GetProductByIdAsync(partnerId, productId);
    }

    public async Task<bool> DeleteProductAsync(int partnerId, int productId)
    {
        var product = await _context.PartnerProducts
            .FirstOrDefaultAsync(p => p.Id == productId && p.PartnerId == partnerId);

        if (product == null) return false;

        // Soft delete - just deactivate
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Partner {PartnerId} deleted product {ProductId}", partnerId, productId);

        return true;
    }

    public async Task<List<string>> GetProductCategoriesAsync(int partnerId)
    {
        return await _context.PartnerProducts
            .Where(p => p.PartnerId == partnerId && !string.IsNullOrEmpty(p.Category))
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    #endregion

    #region Locations

    public async Task<List<PartnerLocationDto>> GetLocationsAsync(int partnerId)
    {
        var locations = await _context.PartnerLocations
            .Where(l => l.PartnerId == partnerId)
            .OrderBy(l => l.Name)
            .ToListAsync();

        var result = new List<PartnerLocationDto>();
        foreach (var l in locations)
        {
            var ordersCount = await _context.Orders.CountAsync(o => o.LocationId == l.Id);
            var revenue = await _context.Orders
                .Where(o => o.LocationId == l.Id)
                .SumAsync(o => (decimal?)o.FinalAmount) ?? 0;

            result.Add(new PartnerLocationDto
            {
                Id = l.Id,
                Name = l.Name,
                Address = l.Address ?? string.Empty,
                City = l.City,
                Phone = l.Phone,
                Latitude = l.Latitude,
                Longitude = l.Longitude,
                IsActive = l.IsActive,
                WorkingHours = l.WorkingHours,
                OrdersCount = ordersCount,
                TotalRevenue = revenue,
                CreatedAt = l.CreatedAt
            });
        }

        return result;
    }

    public async Task<PartnerLocationDto?> GetLocationByIdAsync(int partnerId, int locationId)
    {
        var l = await _context.PartnerLocations
            .FirstOrDefaultAsync(l => l.Id == locationId && l.PartnerId == partnerId);

        if (l == null) return null;

        var ordersCount = await _context.Orders.CountAsync(o => o.LocationId == l.Id);
        var revenue = await _context.Orders
            .Where(o => o.LocationId == l.Id)
            .SumAsync(o => (decimal?)o.FinalAmount) ?? 0;

        return new PartnerLocationDto
        {
            Id = l.Id,
            Name = l.Name,
            Address = l.Address ?? string.Empty,
            City = l.City,
            Phone = l.Phone,
            Latitude = l.Latitude,
            Longitude = l.Longitude,
            IsActive = l.IsActive,
            WorkingHours = l.WorkingHours,
            OrdersCount = ordersCount,
            TotalRevenue = revenue,
            CreatedAt = l.CreatedAt
        };
    }

    #endregion

    #region Employees

    public async Task<List<PartnerEmployeeDto>> GetEmployeesAsync(int partnerId)
    {
        var employees = await _context.PartnerEmployees
            .Include(e => e.User)
            .Where(e => e.PartnerId == partnerId)
            .ToListAsync();

        var locationIds = employees.Where(e => e.LocationId.HasValue).Select(e => e.LocationId!.Value).Distinct();
        var locations = await _context.PartnerLocations
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name ?? l.Address);

        return employees.Select(e => new PartnerEmployeeDto
        {
            Id = e.Id,
            UserId = e.UserId,
            Name = e.User != null ? $"{e.User.FirstName} {e.User.LastName}".Trim() : "Unknown",
            Email = e.User?.Email,
            Phone = e.User?.Phone,
            Role = e.Role ?? "employee",
            LocationId = e.LocationId,
            LocationName = e.LocationId.HasValue && locations.ContainsKey(e.LocationId.Value) 
                ? locations[e.LocationId.Value] 
                : null,
            IsActive = e.IsActive,
            CreatedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<PartnerEmployeeDto?> AddEmployeeAsync(int partnerId, AddEmployeeRequestDto request)
    {
        User? user = null;

        if (request.UserId.HasValue)
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId.Value);
        }
        else if (!string.IsNullOrEmpty(request.Phone))
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == request.Phone);
        }
        else if (!string.IsNullOrEmpty(request.Email))
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        }

        if (user == null)
            return null;

        // Check if already an employee
        var existingEmployee = await _context.PartnerEmployees
            .FirstOrDefaultAsync(e => e.PartnerId == partnerId && e.UserId == user.Id);

        if (existingEmployee != null)
            return null;

        var employee = new PartnerEmployee
        {
            PartnerId = partnerId,
            UserId = user.Id,
            Role = request.Role,
            LocationId = request.LocationId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.PartnerEmployees.Add(employee);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Partner {PartnerId} added employee {UserId}", partnerId, user.Id);

        string? locationName = null;
        if (employee.LocationId.HasValue)
        {
            var location = await _context.PartnerLocations.FirstOrDefaultAsync(l => l.Id == employee.LocationId.Value);
            locationName = location?.Name ?? location?.Address;
        }

        return new PartnerEmployeeDto
        {
            Id = employee.Id,
            UserId = employee.UserId,
            Name = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email,
            Phone = user.Phone,
            Role = employee.Role ?? "employee",
            LocationId = employee.LocationId,
            LocationName = locationName,
            IsActive = employee.IsActive,
            CreatedAt = employee.CreatedAt
        };
    }

    public async Task<bool> RemoveEmployeeAsync(int partnerId, int employeeId)
    {
        var employee = await _context.PartnerEmployees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.PartnerId == partnerId);

        if (employee == null) return false;

        _context.PartnerEmployees.Remove(employee);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Partner {PartnerId} removed employee {EmployeeId}", partnerId, employeeId);

        return true;
    }

    #endregion

    #region Reports

    public async Task<object> GetSalesReportAsync(int partnerId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.Orders.Where(o => o.PartnerId == partnerId);

        if (startDate.HasValue)
            query = query.Where(o => o.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(o => o.CreatedAt <= endDate.Value);

        var totalOrders = await query.CountAsync();
        var completedOrders = await query.CountAsync(o => o.Status == OrderStatus.Completed);
        var totalRevenue = await query.Where(o => o.Status == OrderStatus.Completed).SumAsync(o => (decimal?)o.FinalAmount) ?? 0;
        var totalCashback = await query.SumAsync(o => (decimal?)o.CashbackAmount) ?? 0;

        return new
        {
            total_orders = totalOrders,
            completed_orders = completedOrders,
            total_revenue = totalRevenue,
            total_cashback = totalCashback,
            average_order_value = completedOrders > 0 ? totalRevenue / completedOrders : 0,
            period = new { start_date = startDate, end_date = endDate }
        };
    }

    public Task<byte[]> ExportReportAsync(int partnerId, string reportType, string format = "csv")
    {
        // TODO: Implement CSV export
        throw new NotImplementedException("Экспорт отчетов будет реализован позже");
    }

    #endregion

    #region Private Methods

    private List<string> GetPermissionsForPartnerRole(bool isOwner, string? employeeRole)
    {
        var permissions = new List<string>();

        if (isOwner)
        {
            permissions.AddRange(new[]
            {
                "dashboard.view",
                "orders.read", "orders.write",
                "products.read", "products.write",
                "employees.read", "employees.write",
                "locations.read", "locations.write",
                "transactions.read",
                "reports.view", "reports.export",
                "settings.read", "settings.write"
            });
        }
        else
        {
            switch (employeeRole?.ToLower())
            {
                case "manager":
                    permissions.AddRange(new[]
                    {
                        "dashboard.view",
                        "orders.read", "orders.write",
                        "products.read", "products.write",
                        "employees.read",
                        "transactions.read",
                        "reports.view"
                    });
                    break;
                case "cashier":
                    permissions.AddRange(new[]
                    {
                        "orders.read", "orders.write",
                        "products.read",
                        "transactions.read"
                    });
                    break;
                default: // employee
                    permissions.AddRange(new[]
                    {
                        "orders.read",
                        "products.read"
                    });
                    break;
            }
        }

        return permissions;
    }

    #endregion
}

