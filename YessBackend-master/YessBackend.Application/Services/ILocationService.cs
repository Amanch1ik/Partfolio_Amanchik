using YessBackend.Application.DTOs.Location;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса проверки близости
/// </summary>
public interface ILocationService
{
    Task<ProximityCheckResponseDto> CheckProximityOffersAsync(int userId, ProximityCheckRequestDto request);
}

