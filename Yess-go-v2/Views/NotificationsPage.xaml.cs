using YessGoFront.Views.Controls;
using YessGoFront.ViewModels;
using YessGoFront.Services.Domain;
using YessGoFront.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace YessGoFront.Views;

public partial class NotificationsPage : ContentPage
{
    private readonly NotificationsViewModel _viewModel;
    private readonly INotificationService _notificationService;
    private readonly IAuthService _authService;
    private readonly AppDbContext _dbContext;
    private bool _isInitialized = false;

    public NotificationsPage(NotificationsViewModel viewModel, INotificationService notificationService, IAuthService authService, AppDbContext dbContext)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
        _notificationService = notificationService;
        _authService = authService;
        _dbContext = dbContext;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        
        try 
        {
            // Update bottom navigation bar
            if (this.FindByName<BottomNavBar>("BottomBar") is BottomNavBar bottomBar)
            {
                bottomBar.UpdateSelectedTab("Notifications");
            }
            
            // Ensure ViewModel is initialized and load notifications
            if (!_isInitialized)
            {
                await LoadInitialDataAsync();
                _isInitialized = true;
            }
            else
            {
                // Refresh the notifications
                await _viewModel.LoadInitialAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in OnAppearing: {ex}");
            // Optionally show an error message to the user
            await DisplayAlert("Ошибка", "Не удалось загрузить уведомления. Пожалуйста, попробуйте позже.", "OK");
        }
    }

    private async Task LoadInitialDataAsync()
    {
        try
        {
            // Get current user ID
            var userId = await _authService.GetCurrentUserIdAsync();
            if (userId == null)
            {
                System.Diagnostics.Debug.WriteLine("[NotificationsPage] User is not authenticated");
                _viewModel.HasError = true;
                _viewModel.ErrorMessage = "Вы не авторизованы. Пожалуйста, войдите в аккаунт.";
                return;
            }
            
            // Уведомления загружаются из API (PostgreSQL) и кэшируются в локальной БД
            System.Diagnostics.Debug.WriteLine($"[NotificationsPage] Loading notifications from API for user {userId}");

            // Load notifications through ViewModel (он сам управляет IsBusy)
            System.Diagnostics.Debug.WriteLine("[NotificationsPage] Calling ViewModel.LoadInitialAsync()");
            await _viewModel.LoadInitialAsync();
            
            // Debug: Log the number of notifications loaded
            System.Diagnostics.Debug.WriteLine($"[NotificationsPage] Loaded {_viewModel.Notifications.Count} notifications after LoadInitialAsync");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[NotificationsPage] Error loading initial data: {ex}");
            System.Diagnostics.Debug.WriteLine($"[NotificationsPage] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                System.Diagnostics.Debug.WriteLine($"[NotificationsPage] Inner exception: {ex.InnerException}");
            }
            
            // Убеждаемся, что состояние загрузки сброшено
            _viewModel.IsBusy = false;
            _viewModel.HasError = true;
            _viewModel.ErrorMessage = "Не удалось загрузить уведомления. Пожалуйста, попробуйте позже.";
        }
    }
}
