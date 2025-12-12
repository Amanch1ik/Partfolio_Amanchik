using System;
using System.Threading.Tasks;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Maui.Maps;
using System.Collections.Generic;

namespace YessLoyaltyApp.Services
{
    public interface INativeMapsService
    {
        Task<Location> GetCurrentLocationAsync();
        Task OpenMapsAsync(double latitude, double longitude, string label);
        Task<Route> CalculateRouteAsync(Location start, Location end);
        Task<bool> IsLocationAvailableAsync();
    }

    public class NativeMapsService : INativeMapsService
    {
        private readonly IErrorHandlingService _errorHandler;
        private readonly IMonitoringService _monitoringService;

        public NativeMapsService(
            IErrorHandlingService errorHandler,
            IMonitoringService monitoringService)
        {
            _errorHandler = errorHandler;
            _monitoringService = monitoringService;
        }

        public async Task<Location> GetCurrentLocationAsync()
        {
            try
            {
                var request = new GeolocationRequest(GeolocationAccuracy.Best);
                var location = await Geolocation.GetLocationAsync(request);

                _monitoringService.TrackEvent("LocationRetrieved", new Dictionary<string, string>
                {
                    { "Accuracy", location.Accuracy.ToString() },
                    { "Provider", location.Providers.ToString() }
                });

                return location;
            }
            catch (Exception ex)
            {
                _errorHandler.HandleApiErrorAsync(ex);
                _monitoringService.TrackException(ex);
                return null;
            }
        }

        public async Task OpenMapsAsync(double latitude, double longitude, string label)
        {
            try
            {
                var location = new Location(latitude, longitude);
                await Map.OpenAsync(location, new MapLaunchOptions
                {
                    Name = label,
                    NavigationMode = NavigationMode.Driving
                });

                _monitoringService.TrackEvent("MapOpened", new Dictionary<string, string>
                {
                    { "Destination", label }
                });
            }
            catch (Exception ex)
            {
                _errorHandler.HandleApiErrorAsync(ex);
                _monitoringService.TrackException(ex);
            }
        }

        public async Task<Route> CalculateRouteAsync(Location start, Location end)
        {
            try
            {
                var placemark1 = await Geocoding.GetPlacemarksAsync(start);
                var placemark2 = await Geocoding.GetPlacemarksAsync(end);

                var route = new Route
                {
                    StartLocation = start,
                    EndLocation = end,
                    Distance = Location.CalculateDistance(start, end, DistanceUnits.Kilometers),
                    Waypoints = new List<Location>()
                };

                _monitoringService.TrackEvent("RouteCalculated", new Dictionary<string, string>
                {
                    { "Distance", route.Distance.ToString("F2") },
                    { "StartLocation", $"{start.Latitude},{start.Longitude}" },
                    { "EndLocation", $"{end.Latitude},{end.Longitude}" }
                });

                return route;
            }
            catch (Exception ex)
            {
                _errorHandler.HandleApiErrorAsync(ex);
                _monitoringService.TrackException(ex);
                return null;
            }
        }

        public async Task<bool> IsLocationAvailableAsync()
        {
            try
            {
                var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
                return status == PermissionStatus.Granted;
            }
            catch (Exception ex)
            {
                _errorHandler.HandleApiErrorAsync(ex);
                return false;
            }
        }
    }

    // Модель маршрута для удобства
    public class Route
    {
        public Location StartLocation { get; set; }
        public Location EndLocation { get; set; }
        public double Distance { get; set; }
        public List<Location> Waypoints { get; set; }
    }
}
