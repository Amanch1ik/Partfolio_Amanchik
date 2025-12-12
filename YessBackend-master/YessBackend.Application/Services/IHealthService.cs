namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса проверки здоровья системы
/// </summary>
public interface IHealthService
{
    Task<HealthStatusDto> CheckHealthAsync();
}

/// <summary>
/// DTO для статуса здоровья системы
/// </summary>
public class HealthStatusDto
{
    public string Status { get; set; } = "unknown";
    public string Service { get; set; } = "yess-backend";
    public string Version { get; set; } = "1.0.0";
    public string Database { get; set; } = "unknown";
    public string Cache { get; set; } = "unknown";
}

