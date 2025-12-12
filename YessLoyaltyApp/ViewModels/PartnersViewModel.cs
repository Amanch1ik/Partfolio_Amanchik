using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows.Input;
using YessLoyaltyApp.Models;
using YessLoyaltyApp.Services;

namespace YessLoyaltyApp.ViewModels
{
    public class PartnerFilter
    {
        public List<string> Categories { get; set; } = new List<string>();
        public decimal? MinCashback { get; set; }
        public bool? IsVerified { get; set; }
        public double? MaxDistance { get; set; }
        public string SearchQuery { get; set; }
    }

    public class PartnersViewModel : INotifyPropertyChanged
    {
        private readonly IApiService _apiService;
        private readonly IMonitoringService _monitoringService;
        private readonly INativeMapsService _mapsService;

        private ObservableCollection<Partner> _partners;
        private ObservableCollection<Partner> _allPartners;
        private PartnerFilter _currentFilter = new PartnerFilter();
        private bool _isLoading;
        private string _searchText;
        private Location _currentLocation;

        public ObservableCollection<Partner> Partners 
        { 
            get => _partners; 
            private set 
            {
                _partners = value;
                OnPropertyChanged();
            }
        }

        public string SearchText
        {
            get => _searchText;
            set
            {
                _searchText = value;
                ApplyFilters();
                _monitoringService.TrackEvent("PartnerSearch", new Dictionary<string, string>
                {
                    { "SearchQuery", value ?? "" }
                });
            }
        }

        public ICommand LoadPartnersCommand { get; }
        public ICommand ApplyFilterCommand { get; }
        public ICommand ClearFiltersCommand { get; }
        public ICommand NavigateToPartnerCommand { get; }

        public PartnersViewModel(
            IApiService apiService, 
            IMonitoringService monitoringService,
            INativeMapsService mapsService)
        {
            _apiService = apiService;
            _monitoringService = monitoringService;
            _mapsService = mapsService;

            _partners = new ObservableCollection<Partner>();
            _allPartners = new ObservableCollection<Partner>();

            LoadPartnersCommand = new Command(async () => await LoadPartnersAsync());
            ApplyFilterCommand = new Command<PartnerFilter>(ApplyCustomFilter);
            ClearFiltersCommand = new Command(ClearFilters);
            NavigateToPartnerCommand = new Command<Partner>(NavigateToPartner);

            InitializeLocationTracking();
        }

        private async void InitializeLocationTracking()
        {
            if (await _mapsService.IsLocationAvailableAsync())
            {
                _currentLocation = await _mapsService.GetCurrentLocationAsync();
                _monitoringService.TrackEvent("LocationInitialized", new Dictionary<string, string>
                {
                    { "Latitude", _currentLocation?.Latitude.ToString() ?? "N/A" },
                    { "Longitude", _currentLocation?.Longitude.ToString() ?? "N/A" }
                });
            }
        }

        private async Task LoadPartnersAsync()
        {
            try
            {
                IsLoading = true;
                _monitoringService.TrackEvent("LoadPartners", new Dictionary<string, string>());

                var request = new PartnerSearchRequest
                {
                    Page = 1,
                    PageSize = 50,
                    Filter = new PartnerFilterRequest
                    {
                        Categories = _currentFilter.Categories,
                        MinCashback = _currentFilter.MinCashback,
                        IsVerified = _currentFilter.IsVerified
                    }
                };

                var partners = await _apiService.SearchPartnersAsync(request);
                
                _allPartners = new ObservableCollection<Partner>(partners);
                ApplyFilters();
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await _errorHandlingService.HandleApiErrorAsync(ex);
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void ApplyCustomFilter(PartnerFilter filter)
        {
            _currentFilter = filter ?? new PartnerFilter();
            ApplyFilters();

            _monitoringService.TrackEvent("FilterApplied", new Dictionary<string, string>
            {
                { "Categories", string.Join(",", _currentFilter.Categories) },
                { "MinCashback", _currentFilter.MinCashback?.ToString() ?? "N/A" },
                { "IsVerified", _currentFilter.IsVerified?.ToString() ?? "N/A" }
            });
        }

        private void ApplyFilters()
        {
            var filteredPartners = _allPartners.AsEnumerable();

            // Текстовый поиск
            if (!string.IsNullOrWhiteSpace(_searchText))
            {
                filteredPartners = filteredPartners.Where(p => 
                    p.Name.Contains(_searchText, StringComparison.OrdinalIgnoreCase) ||
                    p.Category.Contains(_searchText, StringComparison.OrdinalIgnoreCase)
                );
            }

            // Фильтр по категориям
            if (_currentFilter.Categories?.Any() == true)
            {
                filteredPartners = filteredPartners.Where(p => 
                    _currentFilter.Categories.Contains(p.Category)
                );
            }

            // Фильтр по кешбэку
            if (_currentFilter.MinCashback.HasValue)
            {
                filteredPartners = filteredPartners.Where(p => 
                    p.CashbackRate >= _currentFilter.MinCashback.Value
                );
            }

            // Фильтр по расстоянию
            if (_currentFilter.MaxDistance.HasValue && _currentLocation != null)
            {
                filteredPartners = filteredPartners.Where(p => 
                    Location.CalculateDistance(
                        new Location(p.Latitude, p.Longitude), 
                        _currentLocation, 
                        DistanceUnits.Kilometers
                    ) <= _currentFilter.MaxDistance.Value
                );
            }

            Partners = new ObservableCollection<Partner>(filteredPartners);
        }

        private void ClearFilters()
        {
            _currentFilter = new PartnerFilter();
            _searchText = string.Empty;
            ApplyFilters();

            _monitoringService.TrackEvent("FilterCleared", new Dictionary<string, string>());
        }

        private async void NavigateToPartner(Partner partner)
        {
            if (partner == null) return;

            try
            {
                await _mapsService.OpenMapsAsync(
                    partner.Latitude, 
                    partner.Longitude, 
                    partner.Name
                );

                _monitoringService.TrackEvent("PartnerNavigation", new Dictionary<string, string>
                {
                    { "PartnerId", partner.Id.ToString() },
                    { "PartnerName", partner.Name }
                });
            }
            catch (Exception ex)
            {
                _monitoringService.TrackException(ex);
                await _errorHandlingService.HandleApiErrorAsync(ex);
            }
        }

        public bool IsLoading
        {
            get => _isLoading;
            private set
            {
                _isLoading = value;
                OnPropertyChanged();
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
