using Microsoft.Maui.Controls;

namespace YessGoFront.Views;

public partial class ConditionsPage : ContentPage
{
    public ConditionsPage()
    {
        InitializeComponent();
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        
        // Обновляем нижний навбар
        if (this.FindByName<Controls.BottomNavBar>("BottomBar") is { } bottom)
            bottom.UpdateSelectedTab("More");
    }

    public async void OnBackTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("///more");
    }
}