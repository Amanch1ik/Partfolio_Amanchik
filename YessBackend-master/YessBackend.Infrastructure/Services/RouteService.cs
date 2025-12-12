using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using YessBackend.Application.DTOs.Route;
using YessBackend.Application.Services;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data;
using TransportMode = YessBackend.Application.DTOs.Route.TransportMode;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис маршрутизации
/// Реализует логику из Python RouteService
/// Использует моки для OSRM и GraphHopper
/// </summary>
public class RouteService : IRouteService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IDistributedCache? _cache;
    private readonly ILogger<RouteService> _logger;
    private readonly HttpClient _httpClient;

    public RouteService(
        ApplicationDbContext context,
        IConfiguration configuration,
        IDistributedCache? cache,
        IHttpClientFactory httpClientFactory,
        ILogger<RouteService> logger)
    {
        _context = context;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<RouteResponseDto> CalculateRouteAsync(RouteRequestDto request)
    {
        try
        {
            // Получаем локации партнеров
            var locations = await _context.PartnerLocations
                .Where(l => request.PartnerLocationIds.Contains(l.Id))
                .ToListAsync();

            if (locations.Count < 2)
            {
                throw new InvalidOperationException("Требуется минимум две локации для построения маршрута");
            }

            // Оптимизация порядка локаций
            List<PartnerLocation> optimizedLocations;
            if (request.OptimizeRoute)
            {
                optimizedLocations = OptimizeRouteOrder(locations);
            }
            else
            {
                optimizedLocations = locations;
            }

            // Получение маршрута (мок-данные)
            var routeData = await GetRouteFromProviderAsync(
                locations: optimizedLocations,
                mode: request.TransportMode ?? YessBackend.Application.DTOs.Route.TransportMode.DRIVING
            );

            return routeData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка расчета маршрута");
            throw;
        }
    }

    public async Task<List<int>> OptimizeRouteAsync(RouteOptimizationRequestDto request)
    {
        try
        {
            var locations = await _context.PartnerLocations
                .Where(l => request.PartnerLocationIds.Contains(l.Id))
                .ToListAsync();

            if (request.StartLocationId.HasValue)
            {
                var startLocation = locations.FirstOrDefault(l => l.Id == request.StartLocationId.Value);
                if (startLocation != null)
                {
                    locations.Remove(startLocation);
                    locations.Insert(0, startLocation);
                }
            }

            var optimizedLocations = OptimizeRouteOrder(locations);
            return optimizedLocations.Select(l => l.Id).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка оптимизации маршрута");
            throw;
        }
    }

    public async Task<RouteResponseDto> GetNavigationAsync(RouteNavigationRequestDto request)
    {
        try
        {
            // Создаем временные локации для расчета
            var startLocation = new PartnerLocation
            {
                Latitude = request.StartLatitude,
                Longitude = request.StartLongitude
            };
            var endLocation = new PartnerLocation
            {
                Latitude = request.EndLatitude,
                Longitude = request.EndLongitude
            };

            var routeData = await GetRouteFromProviderAsync(
                locations: new List<PartnerLocation> { startLocation, endLocation },
                mode: request.TransportMode ?? YessBackend.Application.DTOs.Route.TransportMode.DRIVING
            );

            return routeData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения навигации");
            throw;
        }
    }

    public async Task<RouteResponseDto> GetOsrmNavigationAsync(RouteNavigationRequestDto request)
    {
        try
        {
            var osrmUrl = _configuration["ExternalServices:OsrmUrl"] ?? "https://router.project-osrm.org";
            var profile = MapTransportModeToOsrmProfile(request.TransportMode ?? YessBackend.Application.DTOs.Route.TransportMode.DRIVING);
            var start = $"{request.StartLongitude},{request.StartLatitude}";
            var end = $"{request.EndLongitude},{request.EndLatitude}";
            var url = $"{osrmUrl}/route/v1/{profile}/{start};{end}?overview=full&geometries=geojson";

            try
            {
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var jsonDoc = JsonDocument.Parse(content);
                    var root = jsonDoc.RootElement;

                    if (root.TryGetProperty("code", out var code) && code.GetString() == "Ok" &&
                        root.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
                    {
                        var route = routes[0];
                        var distanceM = route.TryGetProperty("distance", out var dist) ? dist.GetDouble() : 0;
                        var durationS = route.TryGetProperty("duration", out var dur) ? dur.GetDouble() : 0;

                        var totalDistance = $"{distanceM / 1000:F2} km";
                        var minutes = (int)Math.Round(durationS / 60);
                        var estimatedTime = $"{minutes} min";

                        var routePoints = new List<RoutePointResponseDto>
                        {
                            new RoutePointResponseDto
                            {
                                Start = new RoutePointDto { Lat = request.StartLatitude, Lng = request.StartLongitude },
                                End = new RoutePointDto { Lat = request.EndLatitude, Lng = request.EndLongitude },
                                Distance = totalDistance,
                                Duration = estimatedTime
                            }
                        };

                        object? geometry = null;
                        if (route.TryGetProperty("geometry", out var geom))
                        {
                            geometry = JsonSerializer.Deserialize<object>(geom.GetRawText());
                        }

                        return new RouteResponseDto
                        {
                            TotalDistance = totalDistance,
                            EstimatedTime = estimatedTime,
                            RoutePoints = routePoints,
                            Geometry = geometry
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OSRM request failed, using mock data");
            }

            // Fallback на мок-данные
            return GenerateMockRouteResponse(request.StartLatitude, request.StartLongitude, 
                request.EndLatitude, request.EndLongitude);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения OSRM навигации");
            throw;
        }
    }

    public async Task<RouteResponseDto> GetTransitNavigationAsync(RouteNavigationRequestDto request)
    {
        try
        {
            var graphHopperApiKey = _configuration["ExternalServices:GraphHopperApiKey"];
            var graphHopperUrl = _configuration["ExternalServices:GraphHopperUrl"] ?? "https://graphhopper.com/api/1";

            if (string.IsNullOrEmpty(graphHopperApiKey))
            {
                _logger.LogWarning("GraphHopper API key not configured, using mock data");
                return GenerateMockRouteResponse(request.StartLatitude, request.StartLongitude,
                    request.EndLatitude, request.EndLongitude);
            }

            // Проверяем кэш
            var cacheKey = $"route:transit:{request.StartLatitude},{request.StartLongitude}:{request.EndLatitude},{request.EndLongitude}";
            if (_cache != null)
            {
                try
                {
                    var cached = await _cache.GetStringAsync(cacheKey);
                    if (!string.IsNullOrEmpty(cached))
                    {
                        var routeResponse = JsonSerializer.Deserialize<RouteResponseDto>(cached);
                        if (routeResponse != null)
                        {
                            return routeResponse;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Cache read failed");
                }
            }

            // Пробуем запросить у GraphHopper (мок - в реальности нужен реальный запрос)
            try
            {
                // TODO: Реализовать реальный запрос к GraphHopper API
                // Пока используем мок-данные
                _logger.LogInformation("GraphHopper request would be made here (mocked)");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "GraphHopper request failed, using mock data");
            }

            // Возвращаем мок-данные
            var mockResponse = GenerateMockRouteResponse(request.StartLatitude, request.StartLongitude,
                request.EndLatitude, request.EndLongitude);

            // Кэшируем результат
            if (_cache != null)
            {
                try
                {
                    var cacheOptions = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                    };
                    await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(mockResponse), cacheOptions);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Cache write failed");
                }
            }

            return mockResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения транзит навигации");
            throw;
        }
    }

    private List<PartnerLocation> OptimizeRouteOrder(List<PartnerLocation> locations)
    {
        // Простая оптимизация: ближайший сосед (Nearest Neighbor)
        if (locations.Count <= 1)
        {
            return locations;
        }

        var optimized = new List<PartnerLocation> { locations[0] };
        var remaining = locations.Skip(1).ToList();

        while (remaining.Count > 0)
        {
            var current = optimized.Last();
            var nearest = remaining
                .OrderBy(l => CalculateDistance(
                    current.Latitude, current.Longitude,
                    l.Latitude, l.Longitude))
                .First();

            optimized.Add(nearest);
            remaining.Remove(nearest);
        }

        return optimized;
    }

    private double CalculateDistance(double? lat1, double? lon1, double? lat2, double? lon2)
    {
        if (!lat1.HasValue || !lon1.HasValue || !lat2.HasValue || !lon2.HasValue)
        {
            return 0.0;
        }
        return CalculateDistance(lat1.Value, lon1.Value, lat2.Value, lon2.Value);
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        // Простой расчет расстояния (Haversine formula упрощенный)
        const double R = 6371; // Радиус Земли в км
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private async Task<RouteResponseDto> GetRouteFromProviderAsync(
        List<PartnerLocation> locations,
        TransportMode mode)
    {
        // Мок-реализация: генерируем простой маршрут
        if (locations.Count < 2)
        {
            throw new InvalidOperationException("Требуется минимум две локации");
        }

        var totalDistance = 0.0;
        var totalDuration = 0.0;
        var routePoints = new List<RoutePointResponseDto>();

        for (int i = 0; i < locations.Count - 1; i++)
        {
            var from = locations[i];
            var to = locations[i + 1];
            var distance = CalculateDistance(
                from.Latitude, from.Longitude,
                to.Latitude, to.Longitude);
            var duration = distance * GetDurationMultiplier(mode); // минут на км

            totalDistance += distance;
            totalDuration += duration;

            routePoints.Add(new RoutePointResponseDto
            {
                Start = new RoutePointDto { Lat = from.Latitude ?? 0, Lng = from.Longitude ?? 0 },
                End = new RoutePointDto { Lat = to.Latitude ?? 0, Lng = to.Longitude ?? 0 },
                Distance = $"{distance:F2} km",
                Duration = $"{(int)Math.Round(duration)} min"
            });
        }

        return new RouteResponseDto
        {
            TotalDistance = $"{totalDistance:F2} km",
            EstimatedTime = $"{(int)Math.Round(totalDuration)} min",
            RoutePoints = routePoints
        };
    }

    private double GetDurationMultiplier(YessBackend.Application.DTOs.Route.TransportMode mode)
    {
        return mode switch
        {
            TransportMode.DRIVING => 1.0, // 1 мин/км для автомобиля
            TransportMode.WALKING => 12.0, // 12 мин/км для пешком
            TransportMode.BICYCLING => 4.0, // 4 мин/км для велосипеда
            TransportMode.TRANSIT => 2.0, // 2 мин/км для транспорта
            _ => 1.0
        };
    }

    private string MapTransportModeToOsrmProfile(YessBackend.Application.DTOs.Route.TransportMode mode)
    {
        return mode switch
        {
            TransportMode.DRIVING => "driving",
            TransportMode.WALKING => "walking",
            TransportMode.BICYCLING => "cycling",
            TransportMode.TRANSIT => "driving", // OSRM не поддерживает транспорт
            _ => "driving"
        };
    }

    private RouteResponseDto GenerateMockRouteResponse(double startLat, double startLon, double endLat, double endLon)
    {
        var distance = CalculateDistance(startLat, startLon, endLat, endLon);
        var duration = distance * 1.0; // 1 мин/км для автомобиля

        return new RouteResponseDto
        {
            TotalDistance = $"{distance:F2} km",
            EstimatedTime = $"{(int)Math.Round(duration)} min",
            RoutePoints = new List<RoutePointResponseDto>
            {
                new RoutePointResponseDto
                {
                    Start = new RoutePointDto { Lat = startLat, Lng = startLon },
                    End = new RoutePointDto { Lat = endLat, Lng = endLon },
                    Distance = $"{distance:F2} km",
                    Duration = $"{(int)Math.Round(duration)} min"
                }
            }
        };
    }
}

