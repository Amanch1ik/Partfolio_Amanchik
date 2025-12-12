namespace YessGoFront.Views;

public partial class CertificatePage : ContentPage
{

	public CertificatePage()
	{
		InitializeComponent();
    }


    public async void OnBackTapped(object sender, EventArgs e)
	{
		await Shell.Current.GoToAsync("///more");
    }
}