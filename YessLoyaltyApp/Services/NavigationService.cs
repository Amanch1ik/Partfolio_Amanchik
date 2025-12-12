using System;
using System.Threading.Tasks;

namespace YessLoyaltyApp.Services
{
    public interface INavigationService
    {
        Task NavigateToAsync<TPage>() where TPage : Page;
        Task NavigateToAsync<TPage, TViewModel>(Action<TViewModel> configureViewModel = null) 
            where TPage : Page 
            where TViewModel : class;
        Task GoBackAsync();
    }

    public class NavigationService : INavigationService
    {
        private readonly IServiceProvider _serviceProvider;

        public NavigationService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task NavigateToAsync<TPage>() where TPage : Page
        {
            var page = _serviceProvider.GetService<TPage>();
            if (page == null)
            {
                throw new InvalidOperationException($"Page {typeof(TPage).Name} is not registered in the service provider.");
            }

            await NavigateToPageAsync(page);
        }

        public async Task NavigateToAsync<TPage, TViewModel>(Action<TViewModel> configureViewModel = null) 
            where TPage : Page 
            where TViewModel : class
        {
            var page = _serviceProvider.GetService<TPage>();
            var viewModel = _serviceProvider.GetService<TViewModel>();

            if (page == null)
            {
                throw new InvalidOperationException($"Page {typeof(TPage).Name} is not registered in the service provider.");
            }

            if (viewModel == null)
            {
                throw new InvalidOperationException($"ViewModel {typeof(TViewModel).Name} is not registered in the service provider.");
            }

            configureViewModel?.Invoke(viewModel);

            if (page.BindingContext != viewModel)
            {
                page.BindingContext = viewModel;
            }

            await NavigateToPageAsync(page);
        }

        public async Task GoBackAsync()
        {
            if (Application.Current?.MainPage is NavigationPage navigationPage)
            {
                await navigationPage.PopAsync();
            }
            else
            {
                throw new InvalidOperationException("Current main page is not a NavigationPage.");
            }
        }

        private async Task NavigateToPageAsync(Page page)
        {
            if (Application.Current?.MainPage is NavigationPage navigationPage)
            {
                await navigationPage.PushAsync(page);
            }
            else
            {
                Application.Current!.MainPage = new NavigationPage(page);
            }
        }
    }
}
