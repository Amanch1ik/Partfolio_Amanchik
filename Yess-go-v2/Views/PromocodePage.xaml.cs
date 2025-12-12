using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using YessGoFront.ViewModels;

namespace YessGoFront.Views
{
    public partial class PromocodePage : ContentPage
    {
        public PromocodePage()
        {
            InitializeComponent();
            BindingContext = MauiProgram.Services.GetRequiredService<PromocodeViewModel>();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            if (BindingContext is PromocodeViewModel viewModel)
            {
                viewModel.LoadPromoCodeHistoryCommand.ExecuteAsync(null);
            }
        }

        private async void OnBackTapped(object? sender, EventArgs e)
        {
            // Возвращаемся на страницу More
            await Shell.Current.GoToAsync("//main/more");
        }

    }
}
