using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessBackend.Application.DTOs.Location;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис проверки близости
/// Проверяет близлежащих партнеров и отправляет уведомления
/// </summary>
public class LocationService : ILocationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LocationService> _logger;

    public LocationService(
        ApplicationDbContext context,
        ILogger<LocationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ProximityCheckResponseDto> CheckProximityOffersAsync(int userId, ProximityCheckRequestDto request)
    {
        try
        {
            // Находим ближайшие локации партнеров (в радиусе 500 метров)
            const double radiusKm = 0.5; // 500 метров

            // Упрощенная проверка близости (без PostGIS)
            // В реальности нужно использовать ST_DWithin для точного расчета
            var nearbyLocations = await _context.PartnerLocations
                .Where(l => l.IsActive && 
                           l.Latitude.HasValue && 
                           l.Longitude.HasValue &&
                           l.Partner != null &&
                           l.Partner.IsActive)
                .ToListAsync();

            // Фильтруем локации в радиусе (упрощенная формула расстояния)
            var nearbyInRadius = nearbyLocations
                .Where(l => CalculateDistance(
                    (double)l.Latitude!.Value, (double)l.Longitude!.Value,
                    request.Latitude, request.Longitude) <= radiusKm)
                .ToList();

            if (nearbyInRadius.Any())
            {
                _logger.LogInformation(
                    "Found {Count} nearby partners for user {UserId} at ({Lat}, {Lon})",
                    nearbyInRadius.Count, userId, request.Latitude, request.Longitude);

                // TODO: Отправить уведомления о близлежащих партнерах
                // В реальности здесь должна быть логика отправки push/SMS уведомлений
            }

            return new ProximityCheckResponseDto
            {
                Status = "success",
                Message = "Proximity-проверка выполнена"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка проверки близости");
            throw;
        }
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        // Формула Haversine для расчета расстояния между двумя точками
        const double R = 6371; // Радиус Земли в км
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}

