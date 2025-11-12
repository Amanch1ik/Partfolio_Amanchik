using YessLoyaltyApp.ViewModels;

namespace YessLoyaltyApp.Views;

public partial class PartnersPage : ContentPage
{
    public PartnersPage(PartnersViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
