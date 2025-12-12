using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Extensions.Logging;

namespace YessGoFront.Services;

public interface ILocationService
{
    Task<Location?> GetCurrentLocationAsync(CancellationToken cancellationToken = default);
    Task<bool> RequestLocationPermissionAsync();
    bool IsLocationEnabled();
}

public class LocationService : ILocationService
{
    private readonly ILogger<LocationService>? _logger;

    public LocationService(ILogger<LocationService>? logger = null)
    {
        _logger = logger;
    }

    public async Task<bool> RequestLocationPermissionAsync()
    {
        try
        {
            var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
            
            if (status == PermissionStatus.Granted)
            {
                return true;
            }

            if (status == PermissionStatus.Denied && DeviceInfo.Platform == DevicePlatform.iOS)
            {
                // На iOS нужно открыть настройки
                _logger?.LogWarning("Location permission denied on iOS");
                return false;
            }

            status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
            return status == PermissionStatus.Granted;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error requesting location permission");
            return false;
        }
    }

    public bool IsLocationEnabled()
    {
        try
        {
            // Проверяем, включена ли геолокация на устройстве
            // В .NET MAUI это можно проверить через Geolocation
            return true; // Упрощённая проверка
        }
        catch
        {
            return false;
        }
    }

    public async Task<Location?> GetCurrentLocationAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Проверяем разрешение
            var hasPermission = await RequestLocationPermissionAsync();
            if (!hasPermission)
            {
                _logger?.LogWarning("Location permission not granted");
                return null;
            }

            // Проверяем, включена ли геолокация
            if (!IsLocationEnabled())
            {
                _logger?.LogWarning("Location services are disabled");
                return null;
            }

            // Запрашиваем местоположение с высокой точностью
            var request = new GeolocationRequest(
                GeolocationAccuracy.Best,
                TimeSpan.FromSeconds(15));

            var location = await Geolocation.Default.GetLocationAsync(request, cancellationToken);

            if (location == null)
            {
                _logger?.LogWarning("Failed to get location: location is null");
                return null;
            }

            // Валидация координат
            if (!IsValidLocation(location))
            {
                _logger?.LogWarning($"Invalid location coordinates: {location.Latitude}, {location.Longitude}");
                return null;
            }

            _logger?.LogInformation($"Location retrieved: {location.Latitude}, {location.Longitude}");
            return location;
        }
        catch (FeatureNotSupportedException ex)
        {
            _logger?.LogError(ex, "Geolocation is not supported on this device");
            return null;
        }
        catch (FeatureNotEnabledException ex)
        {
            _logger?.LogError(ex, "Location services are not enabled");
            return null;
        }
        catch (PermissionException ex)
        {
            _logger?.LogError(ex, "Location permission denied");
            return null;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting location");
            return null;
        }
    }

    private bool IsValidLocation(Location location)
    {
        // Проверяем, что координаты валидные
        // Исключаем координаты (0,0) и явно неверные значения
        if (location.Latitude == 0 && location.Longitude == 0)
        {
            _logger?.LogWarning("Location coordinates are (0, 0) - invalid");
            return false;
        }

        // Проверяем диапазон широты (-90 до 90)
        if (location.Latitude < -90 || location.Latitude > 90)
        {
            _logger?.LogWarning($"Latitude out of range: {location.Latitude}");
            return false;
        }

        // Проверяем диапазон долготы (-180 до 180)
        if (location.Longitude < -180 || location.Longitude > 180)
        {
            _logger?.LogWarning($"Longitude out of range: {location.Longitude}");
            return false;
        }

        // Исключаем координаты в океанах (Null Island и Атлантический океан)
        // Null Island (0, 0) - уже проверено выше
        
        // Атлантический океан (примерно -30 до 20 широты, -60 до 20 долготы)
        // Но это слишком строго - не будем исключать все координаты в океане
        
        // Исключаем только явно неправильные координаты эмуляторов
        // Типичные координаты эмуляторов: 37.421998, -122.084 (Калифорния) или 0, 0
        
        // Проверяем на координаты эмулятора Android (обычно около 37.42, -122.08)
        if (Math.Abs(location.Latitude - 37.421998) < 0.1 && 
            Math.Abs(location.Longitude - (-122.084)) < 0.1)
        {
            _logger?.LogWarning("Detected emulator coordinates (37.42, -122.08) - invalid");
            return false;
        }

        // Исключаем координаты в Атлантическом океане (Null Island и окрестности)
        // Атлантический океан примерно: широта -30 до 20, долгота -60 до 20
        // Но это слишком строго - проверим только явно океанические координаты
        
        // Проверяем на координаты в Атлантическом океане (Null Island 0,0 уже проверено)
        // Типичные "плохие" координаты: около 0,0 или в открытом океане
        if (Math.Abs(location.Latitude) < 1 && Math.Abs(location.Longitude) < 1)
        {
            _logger?.LogWarning($"Coordinates too close to Null Island (0,0): Lat={location.Latitude}, Lon={location.Longitude}");
            return false;
        }

        // Проверяем на координаты в открытом Атлантическом океане
        // Типичные "плохие" координаты GPS: около 0,0 или в открытом океане
        // Атлантический океан (центральная часть): примерно -20 до 10 широты, -40 до 10 долготы
        // Это область, где НЕТ суши (только океан)
        if (location.Latitude >= -20 && location.Latitude <= 10 &&
            location.Longitude >= -40 && location.Longitude <= 10)
        {
            _logger?.LogWarning($"Coordinates in open Atlantic Ocean (no land): Lat={location.Latitude}, Lon={location.Longitude} - REJECTING");
            return false; // Отклоняем координаты в открытом океане
        }

        // Логируем полученные координаты для отладки
        _logger?.LogInformation($"Validating location: Lat={location.Latitude}, Lon={location.Longitude}");

        return true;
    }
}

