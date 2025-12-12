using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Route;

/// <summary>
/// DTO для точки маршрута
/// </summary>
public class RoutePointResponseDto
{
    [JsonPropertyName("start")]
    public RoutePointDto Start { get; set; } = new();

    [JsonPropertyName("end")]
    public RoutePointDto End { get; set; } = new();

    [JsonPropertyName("distance")]
    public string Distance { get; set; } = string.Empty;

    [JsonPropertyName("duration")]
    public string? Duration { get; set; }
}

/// <summary>
/// DTO для координат точки
/// </summary>
public class RoutePointDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lng")]
    public double Lng { get; set; }
}

/// <summary>
/// DTO для ответа с информацией о маршруте
/// </summary>
public class RouteResponseDto
{
    [JsonPropertyName("total_distance")]
    public string TotalDistance { get; set; } = string.Empty;

    [JsonPropertyName("estimated_time")]
    public string EstimatedTime { get; set; } = string.Empty;

    [JsonPropertyName("route_points")]
    public List<RoutePointResponseDto> RoutePoints { get; set; } = new();

    [JsonPropertyName("geometry")]
    public object? Geometry { get; set; } // GeoJSON LineString (опционально)
}

