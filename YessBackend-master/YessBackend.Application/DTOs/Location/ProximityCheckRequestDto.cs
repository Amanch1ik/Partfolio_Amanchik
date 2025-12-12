using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Location;

/// <summary>
/// DTO для запроса проверки близости
/// </summary>
public class ProximityCheckRequestDto
{
    [JsonPropertyName("latitude")]
    [Required]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    [Required]
    [Range(-180, 180)]
    public double Longitude { get; set; }
}

/// <summary>
/// DTO для ответа проверки близости
/// </summary>
public class ProximityCheckResponseDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "success";

    [JsonPropertyName("message")]
    public string Message { get; set; } = "Proximity-проверка выполнена";
}

