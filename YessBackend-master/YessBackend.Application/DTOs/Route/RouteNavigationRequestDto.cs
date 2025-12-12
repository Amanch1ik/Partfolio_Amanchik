using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Route;

/// <summary>
/// DTO для запроса навигации
/// </summary>
public class RouteNavigationRequestDto
{
    [JsonPropertyName("start_latitude")]
    [Range(-90, 90)]
    public double StartLatitude { get; set; }

    [JsonPropertyName("start_longitude")]
    [Range(-180, 180)]
    public double StartLongitude { get; set; }

    [JsonPropertyName("end_latitude")]
    [Range(-90, 90)]
    public double EndLatitude { get; set; }

    [JsonPropertyName("end_longitude")]
    [Range(-180, 180)]
    public double EndLongitude { get; set; }

    [JsonPropertyName("transport_mode")]
    public TransportMode? TransportMode { get; set; } = DTOs.Route.TransportMode.DRIVING;
}

