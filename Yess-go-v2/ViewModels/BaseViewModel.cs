using CommunityToolkit.Mvvm.ComponentModel;

namespace YessGoFront.ViewModels;

// База для VM с заголовком страницы
public partial class BaseViewModel : ObservableObject
{
    [ObservableProperty]
    private string title = string.Empty;
}
