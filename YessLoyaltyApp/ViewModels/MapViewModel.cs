using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows.Input;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using YessLoyaltyApp.Models;
using YessLoyaltyApp.Services;
using System.Collections.Generic;
using System.Linq;

namespace YessLoyaltyApp.ViewModels
{
    public class MapViewModel : BaseViewModel
    {
        private readonly IApiService _apiService;
        private readonly INavigationService _navigationService;
        private readonly INativeMapsService _mapsService;
        private readonly IMonitoringService _monitoringService;

        private ObservableCollection<Partner> _nearbyPartners;
        private Location _currentLocation;
        private bool _isLoading;

        public ObservableCollection<Partner> NearbyPartners 
        { 
            get => _nearbyPartners;
            set => SetProperty(ref _nearbyPartners, value);
        }

        public bool IsLoading
        {
            get => _isLoading;
            set => SetProperty(ref _isLoading, value);
        }

        public ICommand LoadPartnersCommand { get; }
        public ICommand NavigateToPartnerCommand { get; }
        public ICommand BuildRouteCommand { get; }
        public ICommand RefreshLocationCommand { get; }

        public MapViewModel(
            IApiService apiService,
            INavigationService navigationService,
            INativeMapsService mapsService,
            IMonitoringService monitoringService)
        {
            _apiService = apiService;
            _navigationService = navigationService;
            _mapsService = mapsService;
            _monitoringService = monitoringService;

            NearbyPartners = new ObservableCollection<Partner>();

            LoadPartnersCommand = new Command(async () => await LoadNearbyPartnersAsync());
            NavigateToPartnerCommand = new Command<Partner>(NavigateToPartner);
            BuildRouteCommand = new Command(async () => await BuildRouteToPartners());
            RefreshLocationCommand = new Command(async () => await UpdateCurrentLocation());

            // Автоматическая загрузка при создании
            LoadPartnersCommand.Execute(null);
        }

        private async Task UpdateCurrentLocation()
        {
            try 
            {
                _currentLocation = await _mapsService.GetCurrentLocationAsync();
                
                if (_currentLocation != null)
                {
                    _monitoringService.TrackEvent("LocationUpdated", new Dictionary<string, string>
                    {
                        { "Latitude", _currentLocation.Latitude.ToString() },
                        { "Longitude", _currentLocation.Longitude.ToString() }
                    });

                    await LoadNearbyPartnersAsync();
                }
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось обновить локацию", ex);
            }
        }

        private async Task LoadNearbyPartnersAsync()
        {
            try 
            {
                IsLoading = true;

                if (_currentLocation == null)
                {
                    await UpdateCurrentLocation();
                    return;
                }

                var request = new NearbyPartnerRequest
                {
                    Latitude = _currentLocation.Latitude,
                    Longitude = _currentLocation.Longitude,
                    Radius = 5 // 5 км
                };

                var partners = await _apiService.GetNearbyPartnersAsync(request);
                
                NearbyPartners.Clear();
                foreach (var partner in partners)
                {
                    NearbyPartners.Add(partner);
                }

                _monitoringService.TrackEvent("NearbyPartnersLoaded", new Dictionary<string, string>
                {
                    { "PartnersCount", partners.Count.ToString() }
                });
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось загрузить партнеров", ex);
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void NavigateToPartner(Partner partner)
        {
            if (partner == null) return;

            _monitoringService.TrackEvent("PartnerDetailsOpened", new Dictionary<string, string>
            {
                { "PartnerId", partner.Id.ToString() },
                { "PartnerName", partner.Name }
            });

            _navigationService.NavigateToAsync<PartnerDetailPage, PartnerDetailViewModel>(
                vm => vm.Partner = partner
            );
        }

        private async Task BuildRouteToPartners()
        {
            try 
            {
                if (NearbyPartners.Count < 2)
                {
                    await HandleErrorAsync("Недостаточно партнеров для построения маршрута");
                    return;
                }

                var routeRequest = new RouteRequest
                {
                    PartnerLocationIds = NearbyPartners.Select(p => p.Id).ToList(),
                    TransportMode = TransportMode.Driving
                };

                var route = await _apiService.BuildRouteAsync(routeRequest);

                _monitoringService.TrackEvent("RouteBuilt", new Dictionary<string, string>
                {
                    { "Distance", route.TotalDistance },
                    { "EstimatedTime", route.EstimatedTime }
                });

                // Открываем встроенную навигацию
                await _mapsService.OpenMapsAsync(
                    route.RoutePoints.First().Start.Latitude, 
                    route.RoutePoints.First().Start.Longitude,
                    "Маршрут по партнерам"
                );
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await HandleErrorAsync("Не удалось построить маршрут", ex);
            }
        }
    }
}
