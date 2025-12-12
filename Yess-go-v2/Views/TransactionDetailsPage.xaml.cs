using System;
using Microsoft.Maui.Controls;
using Microsoft.Extensions.DependencyInjection;
using YessGoFront.Services.Api;
using YessGoFront.Services.Domain;
using YessGoFront.ViewModels;

namespace YessGoFront.Views
{
    [QueryProperty(nameof(TransactionId), "id")]
    public partial class TransactionDetailsPage : ContentPage
    {
        public string? TransactionId { get; set; }

        public TransactionDetailsPage()
        {
            InitializeComponent();

            var walletService = MauiProgram.Services.GetRequiredService<IWalletService>();
            var partnersApi = MauiProgram.Services.GetService<IPartnersApiService>();
            BindingContext = new TransactionDetailsViewModel(walletService, partnersApi);
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            if (BindingContext is TransactionDetailsViewModel vm && !string.IsNullOrWhiteSpace(TransactionId))
            {
                await vm.LoadCommand.ExecuteAsync(TransactionId);
            }
        }

        private async void OnBackClicked(object? sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("..", true);
        }
    }
}
