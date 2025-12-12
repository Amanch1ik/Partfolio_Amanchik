using Android.App;
using Android.Content.PM;
using Android.OS;
using Android.Views;
using Microsoft.Maui;
using Microsoft.Maui.Controls.PlatformConfiguration.AndroidSpecific;

namespace YessGoFront;

[Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true,
          ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode |
          ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density,
          LaunchMode = LaunchMode.SingleTop,
          Exported = true,
          WindowSoftInputMode = SoftInput.AdjustResize)]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        
        // Устанавливаем цвет status bar в фирменный зеленый
        if (Build.VERSION.SdkInt >= BuildVersionCodes.Lollipop)
        {
            Window?.SetStatusBarColor(Android.Graphics.Color.ParseColor("#007A51"));
            
            // Делаем статус бар светлым (белый текст на темном фоне)
            if (Build.VERSION.SdkInt >= BuildVersionCodes.M)
            {
                var window = Window;
                var decorView = window?.DecorView;
                if (decorView != null)
                {
                    var flags = (int)decorView.SystemUiVisibility;
                    flags &= ~(int)SystemUiFlags.LightStatusBar;
                    decorView.SystemUiVisibility = (StatusBarVisibility)flags;
                }
            }
        }
    }
}
