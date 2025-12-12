using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Route;

/// <summary>
/// Режим передвижения
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TransportMode
{
    DRIVING,
    WALKING,
    BICYCLING,
    TRANSIT
}

/// <summary>
/// DTO для запроса построения маршрута
/// </summary>
public class RouteRequestDto
{
    [JsonPropertyName("partner_location_ids")]
    [Required]
    [MinLength(2, ErrorMessage = "Требуется минимум две локации для построения маршрута")]
    public List<int> PartnerLocationIds { get; set; } = new();

    [JsonPropertyName("transport_mode")]
    public TransportMode? TransportMode { get; set; }

    [JsonPropertyName("optimize_route")]
    public bool OptimizeRoute { get; set; } = true;
}

