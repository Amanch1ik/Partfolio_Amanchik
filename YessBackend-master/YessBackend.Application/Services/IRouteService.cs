using YessBackend.Application.DTOs.Route;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса маршрутизации
/// </summary>
public interface IRouteService
{
    Task<RouteResponseDto> CalculateRouteAsync(RouteRequestDto request);
    Task<List<int>> OptimizeRouteAsync(RouteOptimizationRequestDto request);
    Task<RouteResponseDto> GetNavigationAsync(RouteNavigationRequestDto request);
    Task<RouteResponseDto> GetOsrmNavigationAsync(RouteNavigationRequestDto request);
    Task<RouteResponseDto> GetTransitNavigationAsync(RouteNavigationRequestDto request);
}

