using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис акций и промо-кодов
/// </summary>
public class PromotionService : IPromotionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PromotionService> _logger;

    public PromotionService(
        ApplicationDbContext context,
        ILogger<PromotionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<object>> GetActivePromotionsAsync(int? partnerId = null, int? cityId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var query = _context.Promotions
                .Where(p => p.IsActive && 
                           (p.ValidUntil == null || p.ValidUntil >= now));

            if (partnerId.HasValue)
            {
                query = query.Where(p => p.PartnerId == partnerId.Value);
            }

            var promotions = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return promotions.Select(p => new
            {
                id = p.Id,
                partner_id = p.PartnerId,
                title = p.Title,
                description = p.Description,
                valid_until = p.ValidUntil,
                created_at = p.CreatedAt
            }).Cast<object>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения активных акций");
            throw;
        }
    }

    public async Task<object?> GetPromotionByIdAsync(int promotionId)
    {
        try
        {
            var promotion = await _context.Promotions
                .FirstOrDefaultAsync(p => p.Id == promotionId);

            if (promotion == null)
            {
                return null;
            }

            return new
            {
                id = promotion.Id,
                partner_id = promotion.PartnerId,
                title = promotion.Title,
                description = promotion.Description,
                valid_until = promotion.ValidUntil,
                is_active = promotion.IsActive,
                created_at = promotion.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения акции по ID");
            throw;
        }
    }

    public async Task<List<object>> GetPromoCodesAsync(int? partnerId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var query = _context.PromoCodes
                .Where(pc => pc.IsActive && 
                            (pc.ValidUntil == null || pc.ValidUntil >= now));

            if (partnerId.HasValue)
            {
                query = query.Where(pc => pc.PartnerId == partnerId.Value);
            }

            var promoCodes = await query
                .OrderByDescending(pc => pc.CreatedAt)
                .ToListAsync();

            return promoCodes.Select(pc => new
            {
                id = pc.Id,
                code = pc.Code,
                partner_id = pc.PartnerId,
                promotion_id = pc.PromotionId,
                valid_until = pc.ValidUntil,
                is_active = pc.IsActive,
                created_at = pc.CreatedAt
            }).Cast<object>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кодов");
            throw;
        }
    }

    public async Task<object?> GetPromoCodeByCodeAsync(string code)
    {
        try
        {
            var now = DateTime.UtcNow;
            var promoCode = await _context.PromoCodes
                .FirstOrDefaultAsync(pc => pc.Code == code && 
                                          pc.IsActive && 
                                          (pc.ValidUntil == null || pc.ValidUntil >= now));

            if (promoCode == null)
            {
                return null;
            }

            return new
            {
                id = promoCode.Id,
                code = promoCode.Code,
                partner_id = promoCode.PartnerId,
                promotion_id = promoCode.PromotionId,
                valid_until = promoCode.ValidUntil,
                is_active = promoCode.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кода");
            throw;
        }
    }

    public async Task<object> ApplyPromoCodeAsync(int userId, string code, int? orderId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var promoCode = await _context.PromoCodes
                .FirstOrDefaultAsync(pc => pc.Code == code && 
                                          pc.IsActive && 
                                          (pc.ValidUntil == null || pc.ValidUntil >= now));

            if (promoCode == null)
            {
                throw new InvalidOperationException("Промо-код не найден или недействителен");
            }

            // Проверяем, использовал ли пользователь уже этот код
            var used = await _context.UserPromoCodes
                .AnyAsync(upc => upc.UserId == userId && upc.PromoCodeId == promoCode.Id);

            if (used)
            {
                throw new InvalidOperationException("Промо-код уже использован");
            }

            // Записываем использование
            var userPromoCode = new UserPromoCode
            {
                UserId = userId,
                PromoCodeId = promoCode.Id,
                UsedAt = now
            };

            _context.UserPromoCodes.Add(userPromoCode);
            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = "Промо-код успешно применен",
                promo_code_id = promoCode.Id
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка применения промо-кода");
            throw;
        }
    }

    public async Task<List<object>> GetUserPromoCodesAsync(int userId)
    {
        try
        {
            var userPromoCodes = await _context.UserPromoCodes
                .Where(upc => upc.UserId == userId)
                .ToListAsync();

            var promoCodeIds = userPromoCodes.Select(upc => upc.PromoCodeId).ToList();
            var promoCodes = await _context.PromoCodes
                .Where(pc => promoCodeIds.Contains(pc.Id))
                .ToListAsync();

            return userPromoCodes.Select(upc =>
            {
                var promoCode = promoCodes.FirstOrDefault(pc => pc.Id == upc.PromoCodeId);
                return new
                {
                    id = upc.Id,
                    promo_code = promoCode?.Code ?? "",
                    used_at = upc.UsedAt
                } as object;
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения промо-кодов пользователя");
            throw;
        }
    }

    public async Task<object> CreatePromoCodeAsync(string code, int? partnerId = null, DateTime? validUntil = null)
    {
        try
        {
            // Проверяем, не существует ли уже такой код
            var existing = await _context.PromoCodes
                .AnyAsync(pc => pc.Code == code);

            if (existing)
            {
                throw new InvalidOperationException("Промо-код уже существует");
            }

            var promoCode = new PromoCode
            {
                Code = code,
                PartnerId = partnerId,
                ValidUntil = validUntil,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.PromoCodes.Add(promoCode);
            await _context.SaveChangesAsync();

            return new
            {
                id = promoCode.Id,
                code = promoCode.Code,
                partner_id = promoCode.PartnerId,
                valid_until = promoCode.ValidUntil,
                message = "Промо-код создан успешно"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания промо-кода");
            throw;
        }
    }

    public async Task<object> ValidatePromoCodeAsync(string code, int userId)
    {
        try
        {
            var now = DateTime.UtcNow;
            var promoCode = await _context.PromoCodes
                .FirstOrDefaultAsync(pc => pc.Code == code && 
                                          pc.IsActive && 
                                          (pc.ValidUntil == null || pc.ValidUntil >= now));

            if (promoCode == null)
            {
                return new
                {
                    valid = false,
                    message = "Промо-код не найден или истек"
                };
            }

            var used = await _context.UserPromoCodes
                .AnyAsync(upc => upc.UserId == userId && upc.PromoCodeId == promoCode.Id);

            if (used)
            {
                return new
                {
                    valid = false,
                    message = "Промо-код уже использован"
                };
            }

            return new
            {
                valid = true,
                message = "Промо-код действителен",
                promo_code_id = promoCode.Id
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки промо-кода");
            throw;
        }
    }

    public async Task<object> GetPromotionStatsAsync()
    {
        try
        {
            var totalPromotions = await _context.Promotions.CountAsync();
            var activePromotions = await _context.Promotions.CountAsync(p => p.IsActive);
            var totalPromoCodes = await _context.PromoCodes.CountAsync();
            var activePromoCodes = await _context.PromoCodes.CountAsync(pc => pc.IsActive);
            var usedPromoCodes = await _context.UserPromoCodes.CountAsync();

            return new
            {
                total_promotions = totalPromotions,
                active_promotions = activePromotions,
                total_promo_codes = totalPromoCodes,
                active_promo_codes = activePromoCodes,
                used_promo_codes = usedPromoCodes
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения статистики акций");
            throw;
        }
    }

    public async Task<object> CheckPromoCodeUsageAsync(int userId, string code)
    {
        try
        {
            var promoCode = await _context.PromoCodes
                .FirstOrDefaultAsync(pc => pc.Code == code);

            if (promoCode == null)
            {
                return new { used = false, message = "Промо-код не найден" };
            }

            var used = await _context.UserPromoCodes
                .AnyAsync(upc => upc.UserId == userId && upc.PromoCodeId == promoCode.Id);

            return new
            {
                used = used,
                message = used ? "Промо-код уже использован" : "Промо-код не использован"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки использования промо-кода");
            throw;
        }
    }
}

