using Microsoft.EntityFrameworkCore;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис партнеров
/// Реализует логику из Python PartnerService
/// </summary>
public class PartnerService : IPartnerService
{
    private readonly ApplicationDbContext _context;

    public PartnerService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Partner>> GetPartnersAsync(
        int? cityId = null,
        string? category = null,
        double? latitude = null,
        double? longitude = null,
        double? radiusKm = null,
        int limit = 50,
        int offset = 0)
    {
        var query = _context.Partners
            .Where(p => p.IsActive)
            .AsQueryable();

        // Фильтр по городу
        if (cityId.HasValue)
        {
            query = query.Where(p => p.CityId == cityId);
        }

        // Фильтр по категории
        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(p => p.Category == category);
        }

        // Фильтр по радиусу (если заданы координаты)
        if (latitude.HasValue && longitude.HasValue && radiusKm.HasValue)
        {
            // Упрощенный расчет расстояния (Haversine формула)
            // В production можно использовать PostGIS для точных расчетов
            var radiusDegrees = radiusKm.Value / 111.0; // примерное преобразование км в градусы

            query = query.Where(p =>
                p.Latitude.HasValue &&
                p.Longitude.HasValue &&
                Math.Abs(p.Latitude.Value - latitude.Value) <= radiusDegrees &&
                Math.Abs(p.Longitude.Value - longitude.Value) <= radiusDegrees);
        }

        return await query
            .OrderByDescending(p => p.IsVerified)
            .ThenBy(p => p.Name)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Partner?> GetPartnerByIdAsync(int partnerId)
    {
        return await _context.Partners
            .Include(p => p.City)
            .Include(p => p.Locations)
            .FirstOrDefaultAsync(p => p.Id == partnerId);
    }

    public async Task<List<PartnerLocation>> GetPartnerLocationsAsync(int partnerId)
    {
        return await _context.PartnerLocations
            .Where(l => l.PartnerId == partnerId && l.IsActive)
            .OrderByDescending(l => l.IsMainLocation)
            .ThenBy(l => l.Address)
            .ToListAsync();
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _context.Partners
            .Where(p => p.IsActive && !string.IsNullOrEmpty(p.Category))
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }
}
