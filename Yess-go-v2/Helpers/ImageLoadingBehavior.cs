using Microsoft.Maui.Controls;
using Microsoft.Maui.ApplicationModel;
using System.Threading.Tasks;

namespace YessGoFront.Helpers;

/// <summary>
/// Поведение для скрытия placeholder'а после загрузки изображения
/// </summary>
public class ImageLoadingBehavior : Behavior<Image>
{
    private Grid? _placeholderGrid;
    private Image? _image;

    protected override void OnAttachedTo(Image bindable)
    {
        base.OnAttachedTo(bindable);
        _image = bindable;
        
        // Подписываемся на изменение Source
        _image.PropertyChanged += OnImagePropertyChanged;
        
        // Даём время визуальному дереву построиться перед поиском placeholder
        _ = Task.Run(async () =>
        {
            await Task.Delay(100);
            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                // Находим placeholder в родительском Grid
                FindPlaceholder();
                
                // Проверяем начальное состояние
                CheckImageLoaded();
            });
            
            // Дополнительная проверка через 3 секунды (максимальный таймаут)
            // Это гарантирует, что placeholder будет скрыт даже если что-то пошло не так
            await Task.Delay(3000);
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                if (_placeholderGrid != null && _placeholderGrid.IsVisible)
                {
                    System.Diagnostics.Debug.WriteLine("[ImageLoadingBehavior] Force hiding placeholder after 3 seconds");
                    await _placeholderGrid.FadeTo(0, 200);
                    _placeholderGrid.IsVisible = false;
                }
            });
        });
    }

    protected override void OnDetachingFrom(Image bindable)
    {
        if (_image != null)
        {
            _image.PropertyChanged -= OnImagePropertyChanged;
        }
        _image = null;
        _placeholderGrid = null;
        base.OnDetachingFrom(bindable);
    }

    private void FindPlaceholder()
    {
        if (_image == null) return;
        
        // Сначала проверяем родительский Grid (где Image и placeholder находятся вместе)
        var parent = _image.Parent;
        if (parent is Grid parentGrid)
        {
            // Ищем в том же Grid, где находится Image
            foreach (var child in parentGrid.Children)
            {
                if (child is Grid placeholderGrid && child != _image)
                {
                    // Проверяем, содержит ли этот Grid ActivityIndicator
                    foreach (var placeholderChild in placeholderGrid.Children)
                    {
                        if (placeholderChild is ActivityIndicator)
                        {
                            _placeholderGrid = placeholderGrid;
                            System.Diagnostics.Debug.WriteLine("[ImageLoadingBehavior] Found placeholder in same Grid as Image");
                            return;
                        }
                    }
                }
            }
        }
        
        // Если не нашли в родительском Grid, поднимаемся по иерархии
        var current = parent;
        int depth = 0;
        const int maxDepth = 10; // Защита от бесконечного цикла
        
        while (current != null && depth < maxDepth)
        {
            if (current is Grid grid)
            {
                // Ищем Grid с ActivityIndicator (это placeholder)
                // Проверяем все дочерние элементы Grid
                foreach (var child in grid.Children)
                {
                    if (child is Grid placeholderGrid && child != _image)
                    {
                        // Проверяем, содержит ли этот Grid ActivityIndicator
                        foreach (var placeholderChild in placeholderGrid.Children)
                        {
                            if (placeholderChild is ActivityIndicator)
                            {
                                _placeholderGrid = placeholderGrid;
                                System.Diagnostics.Debug.WriteLine($"[ImageLoadingBehavior] Found placeholder at depth {depth}");
                                return;
                            }
                        }
                    }
                    // Также проверяем, не является ли сам child ActivityIndicator (на случай другой структуры)
                    else if (child is ActivityIndicator && child != _image)
                    {
                        // Если ActivityIndicator напрямую в Grid, используем этот Grid
                        _placeholderGrid = grid;
                        System.Diagnostics.Debug.WriteLine($"[ImageLoadingBehavior] Found placeholder (direct ActivityIndicator) at depth {depth}");
                        return;
                    }
                }
            }
            current = current.Parent;
            depth++;
        }
        
        System.Diagnostics.Debug.WriteLine($"[ImageLoadingBehavior] Placeholder not found after searching {depth} levels");
    }

    private void OnImagePropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(Image.Source))
        {
            CheckImageLoaded();
        }
    }

    private async void CheckImageLoaded()
    {
        if (_image == null)
            return;

        // Если placeholder ещё не найден, попробуем найти его снова
        if (_placeholderGrid == null)
        {
            FindPlaceholder();
        }

        if (_placeholderGrid == null)
        {
            System.Diagnostics.Debug.WriteLine("[ImageLoadingBehavior] Placeholder not found, cannot hide it");
            return; // Если всё ещё не найден, выходим
        }

        // Если Source установлен, ждём немного и скрываем placeholder
        if (_image.Source != null)
        {
            // Для локальных файлов скрываем сразу, для URL даём время на загрузку
            bool isUrl = _image.Source is UriImageSource;
            int delay = isUrl ? 2000 : 100; // 2 секунды для URL, 100мс для локальных
            
            System.Diagnostics.Debug.WriteLine($"[ImageLoadingBehavior] Source set, waiting {delay}ms before hiding placeholder (isUrl: {isUrl})");
            
            // Просто ждём таймаут и скрываем placeholder
            // Это гарантирует, что placeholder не будет показываться бесконечно
            await Task.Delay(delay);
            
            // Скрываем placeholder независимо от того, загрузилось изображение или нет
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                if (_placeholderGrid != null && _image != null && _image.Source != null)
                {
                    System.Diagnostics.Debug.WriteLine("[ImageLoadingBehavior] Hiding placeholder after timeout");
                    // Плавно скрываем placeholder
                    await _placeholderGrid.FadeTo(0, 200);
                    _placeholderGrid.IsVisible = false;
                }
            });
        }
        else
        {
            // Показываем placeholder если изображение не загружено
            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                if (_placeholderGrid != null)
                {
                    _placeholderGrid.IsVisible = true;
                    _placeholderGrid.Opacity = 1;
                }
            });
        }
    }
}

