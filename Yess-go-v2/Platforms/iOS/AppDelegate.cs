using Foundation;
using UIKit;

namespace YessGoFront;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
	
	public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
	{
		var result = base.FinishedLaunching(application, launchOptions);
		
		// Устанавливаем цвет status bar в фирменный зеленый
		if (UIDevice.CurrentDevice.CheckSystemVersion(13, 0))
		{
			// iOS 13+: используем UIStatusBarStyle для светлого текста на темном фоне
			var statusBarStyle = UIStatusBarStyle.LightContent;
			UIApplication.SharedApplication.SetStatusBarStyle(statusBarStyle, false);
		}
		
		return result;
	}
}
