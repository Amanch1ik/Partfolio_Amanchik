using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.Admin;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис администрирования
/// </summary>
public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminService> _logger;
    private readonly IAuthService _authService;

    public AdminService(
        ApplicationDbContext context, 
        ILogger<AdminService> logger,
        IAuthService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    #region Dashboard

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var now = DateTime.UtcNow;
        var today = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);
        var weekStart = DateTime.SpecifyKind(today.AddDays(-(int)today.DayOfWeek), DateTimeKind.Utc);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = DateTime.SpecifyKind(monthStart.AddMonths(-1), DateTimeKind.Utc);
        var thirtyDaysAgo = DateTime.SpecifyKind(now.AddDays(-30), DateTimeKind.Utc);

        // Получаем активных пользователей - фильтруем по статусу на стороне БД,
        // а фильтрацию по периоду делаем в памяти, чтобы избежать проблем с DateTimeKind
        var allUsersForActive = await _context.Users
            .Where(u => u.IsActive && u.LastLoginAt.HasValue)
            .Select(u => new { u.Id, LastLoginAt = u.LastLoginAt!.Value })
            .ToListAsync();
        
        var activeUsersCount = allUsersForActive.Count(u =>
        {
            var loginDate = u.LastLoginAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(u.LastLoginAt, DateTimeKind.Utc)
                : u.LastLoginAt.ToUniversalTime();
            return loginDate >= thirtyDaysAgo;
        });

        // Получаем пользователей с нормализацией DateTime для подсчета по периодам
        var allUsers = await _context.Users
            .Select(u => new { u.Id, CreatedAt = u.CreatedAt })
            .ToListAsync();
        
        var newUsersToday = allUsers.Count(u =>
        {
            var createdAt = u.CreatedAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc)
                : u.CreatedAt.ToUniversalTime();
            return createdAt >= today;
        });
        
        var newUsersThisWeek = allUsers.Count(u =>
        {
            var createdAt = u.CreatedAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc)
                : u.CreatedAt.ToUniversalTime();
            return createdAt >= weekStart;
        });
        
        var newUsersThisMonth = allUsers.Count(u =>
        {
            var createdAt = u.CreatedAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc)
                : u.CreatedAt.ToUniversalTime();
            return createdAt >= monthStart;
        });

        // Получаем транзакции с нормализацией DateTime - фильтруем по статусу в БД,
        // а временные границы считаем в памяти
        var allTransactions = await _context.Transactions
            .Where(t => t.Status == "completed")
            .Select(t => new { t.Amount, CreatedAt = t.CreatedAt })
            .ToListAsync();
        
        var revenueToday = allTransactions
            .Where(t =>
            {
                var createdAt = t.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
                    : t.CreatedAt.ToUniversalTime();
                return createdAt >= today;
            })
            .Sum(t => t.Amount);
        
        var revenueThisWeek = allTransactions
            .Where(t =>
            {
                var createdAt = t.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
                    : t.CreatedAt.ToUniversalTime();
                return createdAt >= weekStart;
            })
            .Sum(t => t.Amount);
        
        var revenueThisMonth = allTransactions
            .Where(t =>
            {
                var createdAt = t.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
                    : t.CreatedAt.ToUniversalTime();
                return createdAt >= monthStart;
            })
            .Sum(t => t.Amount);
        
        var lastMonthRevenue = allTransactions
            .Where(t =>
            {
                var createdAt = t.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
                    : t.CreatedAt.ToUniversalTime();
                return createdAt >= lastMonthStart && createdAt < monthStart;
            })
            .Sum(t => t.Amount);

        var stats = new DashboardStatsDto
        {
            TotalUsers = await _context.Users.CountAsync(),
            ActiveUsers = activeUsersCount,
            NewUsersToday = newUsersToday,
            NewUsersThisWeek = newUsersThisWeek,
            NewUsersThisMonth = newUsersThisMonth,
            
            TotalPartners = await _context.Partners.CountAsync(),
            ActivePartners = await _context.Partners.CountAsync(p => p.IsActive),
            VerifiedPartners = await _context.Partners.CountAsync(p => p.IsVerified),
            
            TotalTransactions = await _context.Transactions.CountAsync(),
            TotalOrders = await _context.Orders.CountAsync(),
            PendingOrders = await _context.Orders.CountAsync(o => o.Status == OrderStatus.Pending),
            CompletedOrders = await _context.Orders.CountAsync(o => o.Status == OrderStatus.Completed),
            
            TotalRevenue = allTransactions.Sum(t => t.Amount),
            RevenueToday = revenueToday,
            RevenueThisWeek = revenueThisWeek,
            RevenueThisMonth = revenueThisMonth,
        };
        
        if (lastMonthRevenue > 0)
        {
            stats.RevenueGrowthPercent = ((stats.RevenueThisMonth - lastMonthRevenue) / lastMonthRevenue) * 100;
        }

        return stats;
    }

    public async Task<DashboardChartsDto> GetDashboardChartsAsync(int days = 30)
    {
        var endDate = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(1), DateTimeKind.Utc);
        var startDate = DateTime.SpecifyKind(endDate.AddDays(-days), DateTimeKind.Utc);

        var charts = new DashboardChartsDto();

        // Revenue chart - загружаем все успешные транзакции и фильтруем по датам в памяти
        var allTransactionsForChart = await _context.Transactions
            .Where(t => t.Status == "completed")
            .Select(t => new { t.Amount, CreatedAt = t.CreatedAt })
            .ToListAsync();
        
        var revenueData = allTransactionsForChart
            .Where(t =>
            {
                var createdAt = t.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
                    : t.CreatedAt.ToUniversalTime();
                return createdAt >= startDate && createdAt < endDate;
            })
            .GroupBy(t => DateTime.SpecifyKind(t.CreatedAt.Date, DateTimeKind.Utc))
            .Select(g => new { Date = g.Key, Value = g.Sum(t => t.Amount) })
            .OrderBy(x => x.Date)
            .ToList();

        charts.RevenueChart = revenueData.Select(x => new ChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Users chart - загружаем всех пользователей и фильтруем по датам в памяти
        var allUsers = await _context.Users
            .Select(u => new { CreatedAt = u.CreatedAt })
            .ToListAsync();
        
        var usersData = allUsers
            .Where(u =>
            {
                var createdAt = u.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc)
                    : u.CreatedAt.ToUniversalTime();
                return createdAt >= startDate && createdAt < endDate;
            })
            .GroupBy(u => DateTime.SpecifyKind(u.CreatedAt.Date, DateTimeKind.Utc))
            .Select(g => new { Date = g.Key, Value = g.Count() })
            .OrderBy(x => x.Date)
            .ToList();

        charts.UsersChart = usersData.Select(x => new ChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Orders chart - загружаем все заказы и фильтруем по датам в памяти
        var allOrders = await _context.Orders
            .Select(o => new { CreatedAt = o.CreatedAt })
            .ToListAsync();
        
        var ordersData = allOrders
            .Where(o =>
            {
                var createdAt = o.CreatedAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(o.CreatedAt, DateTimeKind.Utc)
                    : o.CreatedAt.ToUniversalTime();
                return createdAt >= startDate && createdAt < endDate;
            })
            .GroupBy(o => DateTime.SpecifyKind(o.CreatedAt.Date, DateTimeKind.Utc))
            .Select(g => new { Date = g.Key, Value = g.Count() })
            .OrderBy(x => x.Date)
            .ToList();

        charts.OrdersChart = ordersData.Select(x => new ChartDataPointDto
        {
            Date = x.Date.ToString("yyyy-MM-dd"),
            Value = x.Value
        }).ToList();

        // Transactions by status
        var totalTransactions = await _context.Transactions.CountAsync();
        var transactionsByStatus = await _context.Transactions
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        charts.TransactionsByStatus = transactionsByStatus.Select(x => new PieChartDataDto
        {
            Name = x.Status ?? "unknown",
            Value = x.Count,
            Percentage = totalTransactions > 0 ? (decimal)x.Count / totalTransactions * 100 : 0
        }).ToList();

        // Partners by category
        var totalPartners = await _context.Partners.CountAsync();
        var partnersByCategory = await _context.Partners
            .Where(p => !string.IsNullOrEmpty(p.Category))
            .GroupBy(p => p.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        charts.PartnersByCategory = partnersByCategory.Select(x => new PieChartDataDto
        {
            Name = x.Category ?? "Без категории",
            Value = x.Count,
            Percentage = totalPartners > 0 ? (decimal)x.Count / totalPartners * 100 : 0
        }).ToList();

        return charts;
    }

    public async Task<TransactionStatsDto> GetTransactionStatsAsync(DateTime? startDate, DateTime? endDate)
    {
        var query = _context.Transactions.AsQueryable();

        if (startDate.HasValue)
        {
            var start = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt >= start);
        }

        if (endDate.HasValue)
        {
            var end = DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt <= end);
        }

        var stats = new TransactionStatsDto
        {
            Total = await query.CountAsync(),
            Completed = await query.CountAsync(t => t.Status == "completed"),
            Pending = await query.CountAsync(t => t.Status == "pending"),
            Failed = await query.CountAsync(t => t.Status == "failed"),
            Cancelled = await query.CountAsync(t => t.Status == "cancelled"),
            TotalAmount = await query.Where(t => t.Status == "completed").SumAsync(t => (decimal?)t.Amount) ?? 0,
            PeriodStart = startDate,
            PeriodEnd = endDate
        };

        if (stats.Completed > 0)
        {
            stats.AverageAmount = stats.TotalAmount / stats.Completed;
        }

        return stats;
    }

    #endregion

    #region User Management

    public async Task<PaginatedResponseDto<AdminUserDto>> GetUsersAsync(UserFilterDto filter, PaginationParams pagination)
    {
        var query = _context.Users
            .Include(u => u.City)
            .Include(u => u.Wallet)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(u => 
                u.Phone.ToLower().Contains(search) ||
                (u.Email != null && u.Email.ToLower().Contains(search)) ||
                (u.FirstName != null && u.FirstName.ToLower().Contains(search)) ||
                (u.LastName != null && u.LastName.ToLower().Contains(search)));
        }

        if (filter.IsActive.HasValue)
            query = query.Where(u => u.IsActive == filter.IsActive.Value);

        if (filter.IsBlocked.HasValue)
            query = query.Where(u => u.IsBlocked == filter.IsBlocked.Value);

        if (filter.CityId.HasValue)
            query = query.Where(u => u.CityId == filter.CityId.Value);

        if (!string.IsNullOrEmpty(filter.Role))
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == filter.Role));

        if (filter.CreatedFrom.HasValue)
        {
            var from = DateTime.SpecifyKind(filter.CreatedFrom.Value, DateTimeKind.Utc);
            query = query.Where(u => u.CreatedAt >= from);
        }

        if (filter.CreatedTo.HasValue)
        {
            var to = DateTime.SpecifyKind(filter.CreatedTo.Value, DateTimeKind.Utc);
            query = query.Where(u => u.CreatedAt <= to);
        }

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "email" => filter.SortDesc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "phone" => filter.SortDesc ? query.OrderByDescending(u => u.Phone) : query.OrderBy(u => u.Phone),
            "name" => filter.SortDesc ? query.OrderByDescending(u => u.FirstName) : query.OrderBy(u => u.FirstName),
            "last_login" => filter.SortDesc ? query.OrderByDescending(u => u.LastLoginAt) : query.OrderBy(u => u.LastLoginAt),
            _ => filter.SortDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt)
        };

        var total = await query.CountAsync();
        var users = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = users.Select(u => MapToAdminUserDto(u)).ToList();

        return new PaginatedResponseDto<AdminUserDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.City)
            .Include(u => u.Wallet)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        var dto = MapToAdminUserDto(user);
        
        // Дополнительная статистика
        dto.OrdersCount = await _context.Orders.CountAsync(o => o.UserId == userId);
        dto.TransactionsCount = await _context.Transactions.CountAsync(t => t.UserId == userId);

        return dto;
    }

    public async Task<AdminUserDto> CreateUserAsync(CreateUserRequestDto request)
    {
        // Проверка существования
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Phone == request.Phone);
        if (existingUser != null)
            throw new InvalidOperationException("Пользователь с таким номером телефона уже существует");

        var user = new User
        {
            Phone = request.Phone,
            Email = request.Email ?? $"{request.Phone}@yess.local",
            FirstName = request.FirstName,
            LastName = request.LastName,
            PasswordHash = _authService.HashPassword(request.Password),
            CityId = request.CityId,
            PhoneVerified = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Создание кошелька
        var wallet = new Wallet
        {
            UserId = user.Id,
            Balance = 0,
            YescoinBalance = 0,
            TotalEarned = 0,
            TotalSpent = 0,
            LastUpdated = DateTime.UtcNow
        };
        _context.Wallets.Add(wallet);

        // Добавление ролей
        if (request.Roles != null && request.Roles.Any())
        {
            foreach (var roleName in request.Roles)
            {
                var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
                if (role != null)
                {
                    _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                }
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin created user {UserId} with phone {Phone}", user.Id, user.Phone);

        return (await GetUserByIdAsync(user.Id))!;
    }

    public async Task<AdminUserDto?> UpdateUserAsync(int userId, UpdateUserRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return null;

        if (!string.IsNullOrEmpty(request.FirstName))
            user.FirstName = request.FirstName;

        if (!string.IsNullOrEmpty(request.LastName))
            user.LastName = request.LastName;

        if (!string.IsNullOrEmpty(request.Email))
            user.Email = request.Email;

        if (request.CityId.HasValue)
            user.CityId = request.CityId;

        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;

        if (request.IsBlocked.HasValue)
            user.IsBlocked = request.IsBlocked.Value;

        if (request.PhoneVerified.HasValue)
            user.PhoneVerified = request.PhoneVerified.Value;

        if (request.EmailVerified.HasValue)
            user.EmailVerified = request.EmailVerified.Value;

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin updated user {UserId}", userId);

        return await GetUserByIdAsync(userId);
    }

    public async Task<OperationResultDto> ToggleUserBlockAsync(int userId, bool block)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return OperationResultDto.Error("Пользователь не найден");

        user.IsBlocked = block;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin {Action} user {UserId}", block ? "blocked" : "unblocked", userId);

        return OperationResultDto.Ok(block ? "Пользователь заблокирован" : "Пользователь разблокирован");
    }

    public async Task<OperationResultDto> DeleteUserAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return OperationResultDto.Error("Пользователь не найден");

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin deactivated user {UserId}", userId);

        return OperationResultDto.Ok("Пользователь деактивирован");
    }

    public async Task<OperationResultDto> ChangeUserRoleAsync(int userId, ChangeUserRoleRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return OperationResultDto.Error("Пользователь не найден");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
        if (role == null)
            return OperationResultDto.Error("Роль не найдена");

        var existingUserRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == role.Id);

        if (request.Action.ToLower() == "add")
        {
            if (existingUserRole != null)
                return OperationResultDto.Error("У пользователя уже есть эта роль");

            _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.Id });
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin added role {Role} to user {UserId}", request.Role, userId);
            return OperationResultDto.Ok($"Роль {request.Role} добавлена пользователю");
        }
        else if (request.Action.ToLower() == "remove")
        {
            if (existingUserRole == null)
                return OperationResultDto.Error("У пользователя нет этой роли");

            _context.UserRoles.Remove(existingUserRole);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin removed role {Role} from user {UserId}", request.Role, userId);
            return OperationResultDto.Ok($"Роль {request.Role} удалена у пользователя");
        }

        return OperationResultDto.Error("Неизвестное действие. Используйте 'add' или 'remove'");
    }

    #endregion

    #region Partner Management

    public async Task<PaginatedResponseDto<AdminPartnerDto>> GetPartnersAsync(PartnerFilterDto filter, PaginationParams pagination)
    {
        var query = _context.Partners
            .Include(p => p.City)
            .AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(p => 
                p.Name.ToLower().Contains(search) ||
                (p.Email != null && p.Email.ToLower().Contains(search)) ||
                (p.Phone != null && p.Phone.ToLower().Contains(search)));
        }

        if (!string.IsNullOrEmpty(filter.Category))
            query = query.Where(p => p.Category == filter.Category);

        if (filter.CityId.HasValue)
            query = query.Where(p => p.CityId == filter.CityId.Value);

        if (filter.IsActive.HasValue)
            query = query.Where(p => p.IsActive == filter.IsActive.Value);

        if (filter.IsVerified.HasValue)
            query = query.Where(p => p.IsVerified == filter.IsVerified.Value);

        if (filter.HasOwner.HasValue)
            query = filter.HasOwner.Value 
                ? query.Where(p => p.OwnerId != null) 
                : query.Where(p => p.OwnerId == null);

        if (filter.CreatedFrom.HasValue)
        {
            var from = DateTime.SpecifyKind(filter.CreatedFrom.Value, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAt >= from);
        }

        if (filter.CreatedTo.HasValue)
        {
            var to = DateTime.SpecifyKind(filter.CreatedTo.Value, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAt <= to);
        }

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "name" => filter.SortDesc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            "category" => filter.SortDesc ? query.OrderByDescending(p => p.Category) : query.OrderBy(p => p.Category),
            _ => filter.SortDesc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt)
        };

        var total = await query.CountAsync();
        var partners = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = new List<AdminPartnerDto>();
        foreach (var partner in partners)
        {
            items.Add(await MapToAdminPartnerDtoAsync(partner));
        }

        return new PaginatedResponseDto<AdminPartnerDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<AdminPartnerDto?> GetPartnerByIdAsync(int partnerId)
    {
        var partner = await _context.Partners
            .Include(p => p.City)
            .FirstOrDefaultAsync(p => p.Id == partnerId);

        if (partner == null) return null;

        return await MapToAdminPartnerDtoAsync(partner);
    }

    public async Task<AdminPartnerDto> CreatePartnerAsync(CreatePartnerRequestDto request)
    {
        var partner = new Partner
        {
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Phone = request.Phone,
            Email = request.Email,
            Website = request.Website,
            CityId = request.CityId,
            OwnerId = request.OwnerId,
            MaxDiscountPercent = request.MaxDiscountPercent,
            CashbackRate = request.CashbackRate,
            DefaultCashbackRate = request.CashbackRate,
            IsActive = true,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Partners.Add(partner);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin created partner {PartnerId} with name {Name}", partner.Id, partner.Name);

        return (await GetPartnerByIdAsync(partner.Id))!;
    }

    public async Task<AdminPartnerDto?> UpdatePartnerAsync(int partnerId, UpdatePartnerRequestDto request)
    {
        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId);
        if (partner == null) return null;

        if (!string.IsNullOrEmpty(request.Name))
            partner.Name = request.Name;

        if (request.Description != null)
            partner.Description = request.Description;

        if (!string.IsNullOrEmpty(request.Category))
            partner.Category = request.Category;

        if (!string.IsNullOrEmpty(request.Phone))
            partner.Phone = request.Phone;

        if (!string.IsNullOrEmpty(request.Email))
            partner.Email = request.Email;

        if (!string.IsNullOrEmpty(request.Website))
            partner.Website = request.Website;

        if (request.CityId.HasValue)
            partner.CityId = request.CityId;

        if (request.IsActive.HasValue)
            partner.IsActive = request.IsActive.Value;

        if (request.IsVerified.HasValue)
            partner.IsVerified = request.IsVerified.Value;

        if (request.MaxDiscountPercent.HasValue)
            partner.MaxDiscountPercent = request.MaxDiscountPercent.Value;

        if (request.CashbackRate.HasValue)
            partner.CashbackRate = request.CashbackRate.Value;

        if (!string.IsNullOrEmpty(request.BankAccount))
            partner.BankAccount = request.BankAccount;

        partner.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin updated partner {PartnerId}", partnerId);

        return await GetPartnerByIdAsync(partnerId);
    }

    public async Task<OperationResultDto> VerifyPartnerAsync(int partnerId)
    {
        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId);
        if (partner == null)
            return OperationResultDto.Error("Партнер не найден");

        partner.IsVerified = true;
        partner.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin verified partner {PartnerId}", partnerId);

        return OperationResultDto.Ok("Партнер верифицирован");
    }

    public async Task<OperationResultDto> DeletePartnerAsync(int partnerId)
    {
        var partner = await _context.Partners.FirstOrDefaultAsync(p => p.Id == partnerId);
        if (partner == null)
            return OperationResultDto.Error("Партнер не найден");

        partner.IsActive = false;
        partner.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin deactivated partner {PartnerId}", partnerId);

        return OperationResultDto.Ok("Партнер деактивирован");
    }

    public async Task<List<string>> GetPartnerCategoriesAsync()
    {
        return await _context.Partners
            .Where(p => !string.IsNullOrEmpty(p.Category))
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    #endregion

    #region Transaction Management

    public async Task<PaginatedResponseDto<AdminTransactionDto>> GetTransactionsAsync(TransactionFilterDto filter, PaginationParams pagination)
    {
        var query = _context.Transactions
            .Include(t => t.User)
            .Include(t => t.Partner)
            .AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(t => 
                (t.Description != null && t.Description.ToLower().Contains(search)) ||
                (t.GatewayTransactionId != null && t.GatewayTransactionId.ToLower().Contains(search)));
        }

        if (filter.UserId.HasValue)
            query = query.Where(t => t.UserId == filter.UserId.Value);

        if (filter.PartnerId.HasValue)
            query = query.Where(t => t.PartnerId == filter.PartnerId.Value);

        if (!string.IsNullOrEmpty(filter.Type))
            query = query.Where(t => t.Type == filter.Type);

        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(t => t.Status == filter.Status);

        if (filter.MinAmount.HasValue)
            query = query.Where(t => t.Amount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(t => t.Amount <= filter.MaxAmount.Value);

        if (filter.CreatedFrom.HasValue)
        {
            var from = DateTime.SpecifyKind(filter.CreatedFrom.Value, DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt >= from);
        }

        if (filter.CreatedTo.HasValue)
        {
            var to = DateTime.SpecifyKind(filter.CreatedTo.Value, DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt <= to);
        }

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "amount" => filter.SortDesc ? query.OrderByDescending(t => t.Amount) : query.OrderBy(t => t.Amount),
            "status" => filter.SortDesc ? query.OrderByDescending(t => t.Status) : query.OrderBy(t => t.Status),
            _ => filter.SortDesc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };

        var total = await query.CountAsync();
        var transactions = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = transactions.Select(t => new AdminTransactionDto
        {
            Id = t.Id,
            UserId = t.UserId,
            UserName = t.User != null ? $"{t.User.FirstName} {t.User.LastName}".Trim() : null,
            UserPhone = t.User?.Phone,
            PartnerId = t.PartnerId,
            PartnerName = t.Partner?.Name,
            Amount = t.Amount,
            Type = t.Type ?? string.Empty,
            Status = t.Status ?? string.Empty,
            Description = t.Description,
            Reference = t.GatewayTransactionId,
            CreatedAt = t.CreatedAt,
            CompletedAt = t.CompletedAt
        }).ToList();

        return new PaginatedResponseDto<AdminTransactionDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<AdminTransactionDto?> GetTransactionByIdAsync(int transactionId)
    {
        var t = await _context.Transactions
            .Include(t => t.User)
            .Include(t => t.Partner)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (t == null) return null;

        return new AdminTransactionDto
        {
            Id = t.Id,
            UserId = t.UserId,
            UserName = t.User != null ? $"{t.User.FirstName} {t.User.LastName}".Trim() : null,
            UserPhone = t.User?.Phone,
            PartnerId = t.PartnerId,
            PartnerName = t.Partner?.Name,
            Amount = t.Amount,
            Type = t.Type ?? string.Empty,
            Status = t.Status ?? string.Empty,
            Description = t.Description,
            Reference = t.GatewayTransactionId,
            CreatedAt = t.CreatedAt,
            CompletedAt = t.CompletedAt
        };
    }

    public async Task<OperationResultDto> UpdateTransactionStatusAsync(int transactionId, UpdateTransactionStatusDto request)
    {
        var transaction = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId);
        if (transaction == null)
            return OperationResultDto.Error("Транзакция не найдена");

        transaction.Status = request.Status;
        if (!string.IsNullOrEmpty(request.Description))
            transaction.Description = request.Description;

        if (request.Status == "completed")
            transaction.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin updated transaction {TransactionId} status to {Status}", transactionId, request.Status);

        return OperationResultDto.Ok("Статус транзакции обновлен");
    }

    #endregion

    #region Order Management

    public async Task<PaginatedResponseDto<AdminOrderDto>> GetOrdersAsync(OrderFilterDto filter, PaginationParams pagination)
    {
        var query = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Partner)
            .AsQueryable();

        // Фильтрация
        if (filter.UserId.HasValue)
            query = query.Where(o => o.UserId == filter.UserId.Value);

        if (filter.PartnerId.HasValue)
            query = query.Where(o => o.PartnerId == filter.PartnerId.Value);

        if (!string.IsNullOrEmpty(filter.Status))
        {
            if (Enum.TryParse<OrderStatus>(filter.Status, true, out var status))
                query = query.Where(o => o.Status == status);
        }

        if (filter.MinAmount.HasValue)
            query = query.Where(o => o.FinalAmount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(o => o.FinalAmount <= filter.MaxAmount.Value);

        if (filter.CreatedFrom.HasValue)
        {
            var from = DateTime.SpecifyKind(filter.CreatedFrom.Value, DateTimeKind.Utc);
            query = query.Where(o => o.CreatedAt >= from);
        }

        if (filter.CreatedTo.HasValue)
        {
            var to = DateTime.SpecifyKind(filter.CreatedTo.Value, DateTimeKind.Utc);
            query = query.Where(o => o.CreatedAt <= to);
        }

        // Сортировка
        query = filter.SortBy.ToLower() switch
        {
            "amount" => filter.SortDesc ? query.OrderByDescending(o => o.FinalAmount) : query.OrderBy(o => o.FinalAmount),
            "status" => filter.SortDesc ? query.OrderByDescending(o => o.Status) : query.OrderBy(o => o.Status),
            _ => filter.SortDesc ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt)
        };

        var total = await query.CountAsync();
        var orders = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = orders.Select(o => new AdminOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : null,
            UserPhone = o.User?.Phone,
            PartnerId = o.PartnerId,
            PartnerName = o.Partner?.Name,
            OriginalAmount = o.OriginalAmount,
            DiscountAmount = o.DiscountAmount,
            CashbackAmount = o.CashbackAmount,
            FinalAmount = o.FinalAmount,
            YescoinUsed = o.YescoinUsed,
            Status = o.Status.ToString(),
            PaymentMethod = o.PaymentMethod,
            PaymentStatus = o.PaymentStatus,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt
        }).ToList();

        return new PaginatedResponseDto<AdminOrderDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<AdminOrderDto?> GetOrderByIdAsync(int orderId)
    {
        var o = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.Partner)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (o == null) return null;

        return new AdminOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : null,
            UserPhone = o.User?.Phone,
            PartnerId = o.PartnerId,
            PartnerName = o.Partner?.Name,
            OriginalAmount = o.OriginalAmount,
            DiscountAmount = o.DiscountAmount,
            CashbackAmount = o.CashbackAmount,
            FinalAmount = o.FinalAmount,
            YescoinUsed = o.YescoinUsed,
            Status = o.Status.ToString(),
            PaymentMethod = o.PaymentMethod,
            PaymentStatus = o.PaymentStatus,
            ItemsCount = o.Items?.Count ?? 0,
            Items = o.Items?.Select(i => new AdminOrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList() ?? new List<AdminOrderItemDto>(),
            Notes = o.Notes,
            IdempotencyKey = o.IdempotencyKey,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt
        };
    }

    public async Task<OperationResultDto> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusDto request)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null)
            return OperationResultDto.Error("Заказ не найден");

        if (Enum.TryParse<OrderStatus>(request.Status, true, out var status))
        {
            order.Status = status;
            if (!string.IsNullOrEmpty(request.Notes))
                order.Notes = request.Notes;

            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin updated order {OrderId} status to {Status}", orderId, request.Status);

            return OperationResultDto.Ok("Статус заказа обновлен");
        }

        return OperationResultDto.Error("Неверный статус заказа");
    }

    #endregion

    #region City Management

    public async Task<List<CityDto>> GetCitiesAsync()
    {
        var cities = await _context.Cities.OrderBy(c => c.Name).ToListAsync();

        var result = new List<CityDto>();
        foreach (var city in cities)
        {
            result.Add(new CityDto
            {
                Id = city.Id,
                Name = city.Name,
                UsersCount = await _context.Users.CountAsync(u => u.CityId == city.Id),
                PartnersCount = await _context.Partners.CountAsync(p => p.CityId == city.Id)
            });
        }

        return result;
    }

    public async Task<CityDto> CreateCityAsync(CreateCityRequestDto request)
    {
        var city = new City { Name = request.Name };
        _context.Cities.Add(city);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin created city {CityId} with name {Name}", city.Id, city.Name);

        return new CityDto
        {
            Id = city.Id,
            Name = city.Name,
            UsersCount = 0,
            PartnersCount = 0
        };
    }

    public async Task<OperationResultDto> DeleteCityAsync(int cityId)
    {
        var city = await _context.Cities.FirstOrDefaultAsync(c => c.Id == cityId);
        if (city == null)
            return OperationResultDto.Error("Город не найден");

        var hasUsers = await _context.Users.AnyAsync(u => u.CityId == cityId);
        var hasPartners = await _context.Partners.AnyAsync(p => p.CityId == cityId);

        if (hasUsers || hasPartners)
            return OperationResultDto.Error("Невозможно удалить город: есть связанные пользователи или партнеры");

        _context.Cities.Remove(city);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin deleted city {CityId}", cityId);

        return OperationResultDto.Ok("Город удален");
    }

    #endregion

    #region Notification Management

    public async Task<PaginatedResponseDto<AdminNotificationDto>> GetNotificationsAsync(PaginationParams pagination)
    {
        var query = _context.Notifications
            .Include(n => n.User)
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();
        var notifications = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = notifications.Select(n => new AdminNotificationDto
        {
            Id = n.Id,
            UserId = n.UserId,
            UserName = n.User != null ? $"{n.User.FirstName} {n.User.LastName}".Trim() : null,
            Title = n.Title ?? string.Empty,
            Message = n.Body,
            Type = n.Type ?? string.Empty,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();

        return new PaginatedResponseDto<AdminNotificationDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<OperationResultDto> BroadcastNotificationAsync(BroadcastNotificationRequestDto request)
    {
        var usersQuery = _context.Users.Where(u => u.IsActive);

        if (request.Target == "specific" && request.UserIds != null && request.UserIds.Any())
        {
            usersQuery = usersQuery.Where(u => request.UserIds.Contains(u.Id));
        }
        else if (request.CityId.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.CityId == request.CityId.Value);
        }

        var userIds = await usersQuery.Select(u => u.Id).ToListAsync();

        var notifications = userIds.Select(userId => new Notification
        {
            UserId = userId,
            Title = request.Title,
            Body = request.Message,
            Type = request.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin sent broadcast notification to {Count} users", notifications.Count);

        return OperationResultDto.Ok($"Уведомление отправлено {notifications.Count} пользователям");
    }

    #endregion

    #region Wallet Management

    public async Task<PaginatedResponseDto<AdminWalletDto>> GetWalletsAsync(PaginationParams pagination)
    {
        var query = _context.Wallets
            .Include(w => w.User)
            .OrderByDescending(w => w.Balance);

        var total = await query.CountAsync();
        var wallets = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync();

        var items = wallets.Select(w => new AdminWalletDto
        {
            Id = w.Id,
            UserId = w.UserId,
            UserName = w.User != null ? $"{w.User.FirstName} {w.User.LastName}".Trim() : null,
            UserPhone = w.User?.Phone,
            Balance = w.Balance,
            YescoinBalance = w.YescoinBalance,
            TotalEarned = w.TotalEarned,
            TotalSpent = w.TotalSpent,
            LastUpdated = w.LastUpdated
        }).ToList();

        return new PaginatedResponseDto<AdminWalletDto>
        {
            Items = items,
            Total = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<OperationResultDto> AdjustWalletBalanceAsync(int userId, decimal amount, string reason)
    {
        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null)
            return OperationResultDto.Error("Кошелек не найден");

        wallet.Balance += amount;
        if (amount > 0)
            wallet.TotalEarned += amount;
        else
            wallet.TotalSpent += Math.Abs(amount);

        wallet.LastUpdated = DateTime.UtcNow;

        // Создаем транзакцию для истории
        var transaction = new Transaction
        {
            UserId = userId,
            Amount = Math.Abs(amount),
            Type = amount > 0 ? "admin_credit" : "admin_debit",
            Status = "completed",
            Description = reason,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin adjusted wallet for user {UserId} by {Amount}: {Reason}", userId, amount, reason);

        return OperationResultDto.Ok($"Баланс изменен на {amount}");
    }

    #endregion

    #region Admin Profile

    public async Task<AdminProfileDto?> GetAdminProfileAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

        return new AdminProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Phone = user.Phone,
            Name = !string.IsNullOrWhiteSpace($"{user.FirstName} {user.LastName}".Trim()) 
                ? $"{user.FirstName} {user.LastName}".Trim() 
                : (user.Email ?? user.Phone ?? "Admin"),
            FirstName = user.FirstName,
            LastName = user.LastName,
            AvatarUrl = user.AvatarUrl,
            Role = roles.Contains("admin") ? "admin" : (roles.Contains("superadmin") ? "superadmin" : "user"),
            Roles = roles,
            Permissions = GetPermissionsForRoles(roles),
            LastLoginAt = user.LastLoginAt
        };
    }

    public async Task<bool> IsAdminAsync(int userId)
    {
        return await _context.UserRoles
            .Include(ur => ur.Role)
            .AnyAsync(ur => ur.UserId == userId && 
                          (ur.Role.Name == "admin" || ur.Role.Name == "superadmin"));
    }

    #endregion

    #region Reports

    public async Task<object> GetUsersReportAsync(DateTime? startDate, DateTime? endDate)
    {
        var query = _context.Users.AsQueryable();

        if (startDate.HasValue)
            query = query.Where(u => u.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(u => u.CreatedAt <= endDate.Value);

        return new
        {
            total_registered = await query.CountAsync(),
            active_users = await query.CountAsync(u => u.IsActive),
            blocked_users = await query.CountAsync(u => u.IsBlocked),
            verified_users = await query.CountAsync(u => u.PhoneVerified),
            period = new { start_date = startDate, end_date = endDate }
        };
    }

    public async Task<object> GetPartnersReportAsync()
    {
        var categories = await _context.Partners
            .Where(p => !string.IsNullOrEmpty(p.Category))
            .GroupBy(p => p.Category)
            .Select(g => new { category = g.Key, count = g.Count() })
            .ToListAsync();

        return new
        {
            total_partners = await _context.Partners.CountAsync(),
            active_partners = await _context.Partners.CountAsync(p => p.IsActive),
            verified_partners = await _context.Partners.CountAsync(p => p.IsVerified),
            by_category = categories
        };
    }

    public Task<byte[]> ExportDataAsync(string entityType, string format = "csv")
    {
        // TODO: Implement CSV/Excel export
        throw new NotImplementedException("Экспорт данных будет реализован позже");
    }

    #endregion

    #region Private Methods

    private AdminUserDto MapToAdminUserDto(User user)
    {
        return new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email,
            Phone = user.Phone,
            FirstName = user.FirstName,
            LastName = user.LastName,
            AvatarUrl = user.AvatarUrl,
            CityId = user.CityId,
            CityName = user.City?.Name,
            IsActive = user.IsActive,
            IsBlocked = user.IsBlocked,
            PhoneVerified = user.PhoneVerified,
            EmailVerified = user.EmailVerified,
            ReferralCode = user.ReferralCode,
            ReferredBy = user.ReferredBy,
            WalletBalance = user.Wallet?.Balance ?? 0,
            YescoinBalance = user.Wallet?.YescoinBalance ?? 0,
            TotalSpent = user.Wallet?.TotalSpent ?? 0,
            TotalEarned = user.Wallet?.TotalEarned ?? 0,
            Roles = user.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new List<string>(),
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    private async Task<AdminPartnerDto> MapToAdminPartnerDtoAsync(Partner partner)
    {
        User? owner = null;
        if (partner.OwnerId.HasValue)
        {
            owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == partner.OwnerId.Value);
        }

        return new AdminPartnerDto
        {
            Id = partner.Id,
            Name = partner.Name,
            Description = partner.Description,
            Category = partner.Category,
            LogoUrl = partner.LogoUrl,
            CoverImageUrl = partner.CoverImageUrl,
            Phone = partner.Phone,
            Email = partner.Email,
            Website = partner.Website,
            CityId = partner.CityId,
            CityName = partner.City?.Name,
            OwnerId = partner.OwnerId,
            OwnerName = owner != null ? $"{owner.FirstName} {owner.LastName}".Trim() : null,
            OwnerPhone = owner?.Phone,
            IsActive = partner.IsActive,
            IsVerified = partner.IsVerified,
            MaxDiscountPercent = partner.MaxDiscountPercent,
            CashbackRate = partner.CashbackRate,
            DefaultCashbackRate = partner.DefaultCashbackRate,
            BankAccount = partner.BankAccount,
            LocationsCount = await _context.PartnerLocations.CountAsync(l => l.PartnerId == partner.Id),
            ProductsCount = await _context.PartnerProducts.CountAsync(p => p.PartnerId == partner.Id),
            EmployeesCount = await _context.PartnerEmployees.CountAsync(e => e.PartnerId == partner.Id),
            OrdersCount = await _context.Orders.CountAsync(o => o.PartnerId == partner.Id),
            TotalRevenue = await _context.Transactions
                .Where(t => t.PartnerId == partner.Id && t.Status == "completed")
                .SumAsync(t => (decimal?)t.Amount) ?? 0,
            TransactionsCount = await _context.Transactions.CountAsync(t => t.PartnerId == partner.Id),
            Latitude = partner.Latitude,
            Longitude = partner.Longitude,
            CreatedAt = partner.CreatedAt,
            UpdatedAt = partner.UpdatedAt
        };
    }

    private List<string> GetPermissionsForRoles(List<string> roles)
    {
        var permissions = new HashSet<string>();

        foreach (var role in roles)
        {
            switch (role.ToLower())
            {
                case "superadmin":
                    permissions.Add("*"); // All permissions
                    break;
                case "admin":
                    permissions.Add("users.read");
                    permissions.Add("users.write");
                    permissions.Add("partners.read");
                    permissions.Add("partners.write");
                    permissions.Add("orders.read");
                    permissions.Add("orders.write");
                    permissions.Add("transactions.read");
                    permissions.Add("transactions.write");
                    permissions.Add("notifications.send");
                    permissions.Add("reports.view");
                    break;
                case "moderator":
                    permissions.Add("users.read");
                    permissions.Add("partners.read");
                    permissions.Add("orders.read");
                    permissions.Add("transactions.read");
                    break;
            }
        }

        return permissions.ToList();
    }

    #endregion
}

