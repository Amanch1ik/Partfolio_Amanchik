using System;
using System.Threading.Tasks;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace YessLoyaltyApp.Services
{
    public interface IProximityService
    {
        Task StartProximityMonitoring();
        Task StopProximityMonitoring();
        event EventHandler<ProximityOfferEventArgs> ProximityOfferReceived;
    }

    public class ProximityOfferEventArgs : EventArgs
    {
        public string PartnerName { get; set; }
        public string OfferMessage { get; set; }
        public decimal CashbackRate { get; set; }
    }

    public class ProximityService : IProximityService
    {
        private readonly IApiService _apiService;
        private readonly ILogger<ProximityService> _logger;
        private readonly IMonitoringService _monitoringService;
        
        // Таймер для периодической проверки
        private System.Timers.Timer _proximityTimer;
        
        // Последняя известная локация
        private Location _lastKnownLocation;
        
        // Минимальное расстояние для триггера (в метрах)
        private const double PROXIMITY_THRESHOLD = 500;

        public event EventHandler<ProximityOfferEventArgs> ProximityOfferReceived;

        public ProximityService(
            IApiService apiService, 
            ILogger<ProximityService> logger,
            IMonitoringService monitoringService)
        {
            _apiService = apiService;
            _logger = logger;
            _monitoringService = monitoringService;
        }

        public async Task StartProximityMonitoring()
        {
            try 
            {
                // Проверяем разрешения на геолокацию
                var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
                if (status != PermissionStatus.Granted)
                {
                    status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
                    if (status != PermissionStatus.Granted)
                    {
                        _logger.LogWarning("Геолокация не разрешена");
                        return;
                    }
                }

                // Настройка таймера
                _proximityTimer = new System.Timers.Timer(5 * 60 * 1000); // Каждые 5 минут
                _proximityTimer.Elapsed += async (sender, e) => await CheckProximityOffers();
                _proximityTimer.Start();

                _monitoringService.TrackEvent("ProximityMonitoringStarted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка запуска proximity-мониторинга");
                _monitoringService.TrackException(ex);
            }
        }

        public Task StopProximityMonitoring()
        {
            _proximityTimer?.Stop();
            _monitoringService.TrackEvent("ProximityMonitoringStopped");
            return Task.CompletedTask;
        }

        private async Task CheckProximityOffers()
        {
            try 
            {
                // Получаем текущую локацию
                var location = await Geolocation.GetLocationAsync(
                    new GeolocationRequest(GeolocationAccuracy.Best)
                );

                // Проверяем изменение локации
                if (_lastKnownLocation == null || 
                    Location.CalculateDistance(_lastKnownLocation, location, DistanceUnits.Kilometers) > 0.1)
                {
                    _lastKnownLocation = location;

                    // Отправляем координаты на бэкенд
                    var response = await _apiService.CheckProximityOffersAsync(new 
                    {
                        latitude = location.Latitude,
                        longitude = location.Longitude
                    });

                    // Если получены предложения
                    if (response.Offers?.Any() == true)
                    {
                        foreach (var offer in response.Offers)
                        {
                            ProximityOfferReceived?.Invoke(this, new ProximityOfferEventArgs
                            {
                                PartnerName = offer.PartnerName,
                                OfferMessage = offer.Message,
                                CashbackRate = offer.CashbackRate
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка проверки proximity-предложений");
                _monitoringService.TrackException(ex);
            }
        }
    }
}
