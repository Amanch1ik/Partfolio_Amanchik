using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Route;

/// <summary>
/// DTO для запроса оптимизации маршрута
/// </summary>
public class RouteOptimizationRequestDto
{
    [JsonPropertyName("partner_location_ids")]
    [Required]
    [MinLength(2, ErrorMessage = "Требуется минимум две локации")]
    public List<int> PartnerLocationIds { get; set; } = new();

    [JsonPropertyName("start_location_id")]
    public int? StartLocationId { get; set; }
}

