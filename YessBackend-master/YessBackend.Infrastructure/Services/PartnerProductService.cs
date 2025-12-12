using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.PartnerProduct;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис товаров партнеров
/// Реализует логику из Python PartnerProductService
/// </summary>
public class PartnerProductService : IPartnerProductService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PartnerProductService> _logger;

    public PartnerProductService(
        ApplicationDbContext context,
        ILogger<PartnerProductService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PartnerProductListResponseDto> GetPartnerProductsAsync(
        int partnerId,
        string? category = null,
        bool? isAvailable = null,
        int page = 1,
        int pageSize = 20)
    {
        try
        {
            var query = _context.PartnerProducts
                .Where(p => p.PartnerId == partnerId);

            // Фильтры
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(p => p.Category == category);
            }

            if (isAvailable.HasValue)
            {
                query = query.Where(p => p.IsAvailable == isAvailable.Value);
            }

            // Подсчет общего количества
            var total = await query.CountAsync();

            // Пагинация
            var products = await query
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = products.Select(p => MapToResponseDto(p)).ToList();

            return new PartnerProductListResponseDto
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения товаров партнера");
            throw;
        }
    }

    public async Task<PartnerProduct?> GetPartnerProductByIdAsync(int partnerId, int productId)
    {
        try
        {
            return await _context.PartnerProducts
                .FirstOrDefaultAsync(p => p.Id == productId && p.PartnerId == partnerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения товара по ID");
            throw;
        }
    }

    public async Task<PartnerProduct> CreatePartnerProductAsync(int partnerId, PartnerProductCreateDto createDto)
    {
        try
        {
            var product = new PartnerProduct
            {
                PartnerId = partnerId,
                Name = createDto.Name,
                NameKg = createDto.NameKg,
                NameRu = createDto.NameRu,
                Description = createDto.Description,
                Price = createDto.Price,
                Category = createDto.Category,
                ImageUrl = createDto.ImageUrl,
                Images = createDto.Images != null ? JsonSerializer.Serialize(createDto.Images) : null,
                IsAvailable = createDto.IsAvailable,
                StockQuantity = createDto.StockQuantity,
                Sku = createDto.Sku,
                DiscountPercent = createDto.DiscountPercent,
                OriginalPrice = createDto.OriginalPrice,
                SortOrder = createDto.SortOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PartnerProducts.Add(product);
            await _context.SaveChangesAsync();

            return product;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания товара партнера");
            throw;
        }
    }

    public async Task<PartnerProduct> UpdatePartnerProductAsync(int partnerId, int productId, PartnerProductUpdateDto updateDto)
    {
        try
        {
            var product = await GetPartnerProductByIdAsync(partnerId, productId);
            if (product == null)
            {
                throw new InvalidOperationException("Товар не найден");
            }

            // Обновляем только указанные поля
            if (updateDto.Name != null) product.Name = updateDto.Name;
            if (updateDto.NameKg != null) product.NameKg = updateDto.NameKg;
            if (updateDto.NameRu != null) product.NameRu = updateDto.NameRu;
            if (updateDto.Description != null) product.Description = updateDto.Description;
            if (updateDto.Price.HasValue) product.Price = updateDto.Price.Value;
            if (updateDto.Category != null) product.Category = updateDto.Category;
            if (updateDto.ImageUrl != null) product.ImageUrl = updateDto.ImageUrl;
            if (updateDto.Images != null) product.Images = JsonSerializer.Serialize(updateDto.Images);
            if (updateDto.IsAvailable.HasValue) product.IsAvailable = updateDto.IsAvailable.Value;
            if (updateDto.StockQuantity.HasValue) product.StockQuantity = updateDto.StockQuantity.Value;
            if (updateDto.Sku != null) product.Sku = updateDto.Sku;
            if (updateDto.DiscountPercent.HasValue) product.DiscountPercent = updateDto.DiscountPercent.Value;
            if (updateDto.OriginalPrice.HasValue) product.OriginalPrice = updateDto.OriginalPrice.Value;
            if (updateDto.SortOrder.HasValue) product.SortOrder = updateDto.SortOrder.Value;

            product.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return product;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления товара партнера");
            throw;
        }
    }

    public async Task DeletePartnerProductAsync(int partnerId, int productId)
    {
        try
        {
            var product = await GetPartnerProductByIdAsync(partnerId, productId);
            if (product == null)
            {
                throw new InvalidOperationException("Товар не найден");
            }

            _context.PartnerProducts.Remove(product);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления товара партнера");
            throw;
        }
    }

    private PartnerProductResponseDto MapToResponseDto(PartnerProduct product)
    {
        List<string>? images = null;
        if (!string.IsNullOrEmpty(product.Images))
        {
            try
            {
                images = JsonSerializer.Deserialize<List<string>>(product.Images);
            }
            catch
            {
                // Если не удалось распарсить, оставляем null
            }
        }

        return new PartnerProductResponseDto
        {
            Id = product.Id,
            PartnerId = product.PartnerId,
            Name = product.Name,
            NameKg = product.NameKg,
            NameRu = product.NameRu,
            Description = product.Description,
            Price = product.Price,
            Category = product.Category,
            ImageUrl = product.ImageUrl,
            Images = images,
            IsAvailable = product.IsAvailable,
            StockQuantity = product.StockQuantity,
            Sku = product.Sku,
            DiscountPercent = product.DiscountPercent,
            OriginalPrice = product.OriginalPrice,
            SortOrder = product.SortOrder,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };
    }
}

