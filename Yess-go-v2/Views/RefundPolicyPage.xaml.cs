using YessGoFront.Views.Controls;

namespace YessGoFront.Views;

public partial class RefundPolicyPage : ContentPage
{
    public RefundPolicyPage()
    {
        InitializeComponent();
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        
        // Update bottom navigation bar
        if (this.FindByName<BottomNavBar>("BottomBar") is BottomNavBar bottomBar)
        {
            bottomBar.UpdateSelectedTab("More");
        }
    }

    public async void OnBackTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("///more");
    }
}

