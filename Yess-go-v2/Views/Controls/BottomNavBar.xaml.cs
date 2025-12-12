using System;
using Microsoft.Maui.Controls;

namespace YessGoFront.Views.Controls
{
    public partial class BottomNavBar : ContentView
    {
        private string _selectedTab = "Home";

        public BottomNavBar()
        {
            InitializeComponent();
        }

        // ✅ Вызывается из страниц (MainPage, MorePage и т.д.)
        public void UpdateSelectedTab(string tab)
        {
            _selectedTab = tab;

            // Сбрасываем все иконки и подписи в неактивное состояние
            HomeIcon.Source = "nav_home.png";
            PartnerIcon.Source = "nav_partners.png";
            BellIcon.Source = "nav_notification.png";
            MoreIcon.Source = "nav_more.png";

            HomeText.TextColor = Color.FromArgb("#9E9E9E");
            PartnerText.TextColor = Color.FromArgb("#9E9E9E");
            BellText.TextColor = Color.FromArgb("#9E9E9E");
            MoreText.TextColor = Color.FromArgb("#9E9E9E");

            // Активная вкладка
            switch (tab)
            {
                case "Home":
                    HomeIcon.Source = "nav_home_press.png";
                    HomeText.TextColor = Color.FromArgb("#146B4D");
                    break;

                case "Partners":
                    PartnerIcon.Source = "nav_partners_press.png";
                    PartnerText.TextColor = Color.FromArgb("#146B4D");
                    break;

                case "Notifications":
                    BellIcon.Source = "nav_notification_press.png";
                    BellText.TextColor = Color.FromArgb("#146B4D");
                    break;

                case "More":
                    MoreIcon.Source = "nav_more_press.png";
                    MoreText.TextColor = Color.FromArgb("#146B4D");
                    break;
            }
        }

        // 🏠 Главная
        private async void OnHomeTapped(object? sender, EventArgs e)
        {
            UpdateSelectedTab("Home");
            await Shell.Current.GoToAsync("//main/home");
        }

        // 🤝 Партнёры
        private async void OnPartnerTapped(object? sender, EventArgs e)
        {
            UpdateSelectedTab("Partners");
            await Shell.Current.GoToAsync("//main/partner");
        }

        // 📱 QR
        private async void OnQrTapped(object? sender, EventArgs e)
        {
            UpdateSelectedTab("QR");
            await Shell.Current.GoToAsync("//main/qr");
        }

        // 🔔 Уведомления
        private async void OnNotificationsTapped(object? sender, EventArgs e)
        {
            UpdateSelectedTab("Notifications");
            await Shell.Current.GoToAsync("//main/notifications");
        }

        // ⋯ Ещё
        private async void OnMoreTapped(object? sender, EventArgs e)
        {
            UpdateSelectedTab("More");
            await Shell.Current.GoToAsync("//main/more");
        }
    }
}
