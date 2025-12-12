using System;
using System.Globalization;
using Microsoft.Maui.Controls;
using YessGoFront.Config;
#if ANDROID
using Android.Util;
#endif

namespace YessGoFront.Converters;

/// <summary>
/// Конвертер для преобразования строки (URL или путь к локальному файлу) в ImageSource
/// Автоматически определяет тип источника и создаёт соответствующий ImageSource
/// Если URL относительный, добавляет базовый URL сервера
/// </summary>
public class StringToImageSourceConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not string imagePath || string.IsNullOrWhiteSpace(imagePath))
        {
#if ANDROID
            Log.Debug("StringToImageSourceConverter", "[Convert] Empty or null image path");
#endif
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Empty or null image path");
            return null;
        }

#if ANDROID
        Log.Info("StringToImageSourceConverter", $"[Convert] Converting: {imagePath}");
#endif
        System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Converting: {imagePath}");

        // Сначала проверяем, является ли это абсолютным URL (http:// или https://)
        if (Uri.TryCreate(imagePath, UriKind.Absolute, out var absoluteUri) 
            && (absoluteUri.Scheme == Uri.UriSchemeHttp || absoluteUri.Scheme == Uri.UriSchemeHttps))
        {
            // Это абсолютный URL - используем UriImageSource
#if ANDROID
            Log.Info("StringToImageSourceConverter", $"[Convert] Using UriImageSource for absolute URL: {absoluteUri}");
#endif
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Using UriImageSource for absolute URL: {absoluteUri}");
            try
            {
                var imageSource = new UriImageSource
                {
                    Uri = absoluteUri,
                    CachingEnabled = true,
                    CacheValidity = TimeSpan.FromDays(7)
                };
                
#if ANDROID
                Log.Info("StringToImageSourceConverter", $"[Convert] UriImageSource created successfully for: {absoluteUri}");
#endif
                System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] UriImageSource created successfully for: {absoluteUri}");
                
                return imageSource;
            }
            catch (Exception ex)
            {
#if ANDROID
                Log.Error("StringToImageSourceConverter", $"[Convert] Error creating UriImageSource for '{absoluteUri}': {ex.Message}");
#endif
                System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Error creating UriImageSource for '{absoluteUri}': {ex.Message}");
                return null;
            }
        }

        // Проверяем, является ли это относительным URL (начинается с /)
        // НО только если это не похоже на локальный файл из Resources
        // Локальные файлы из Resources обычно имеют расширение (.png, .jpg и т.д.) и не начинаются с /
        bool looksLikeLocalFile = imagePath.Contains(".") && 
                                   (imagePath.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                                    imagePath.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                                    imagePath.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                                    imagePath.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ||
                                    imagePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase)) &&
                                   !imagePath.Contains("/") && !imagePath.Contains("\\");
        
        if (imagePath.StartsWith("/") && !looksLikeLocalFile)
        {
            // Это относительный URL - нормализуем и создаём абсолютный URL
            string normalizedUrl = NormalizeImageUrl(imagePath);
#if ANDROID
            Log.Info("StringToImageSourceConverter", $"[Convert] Normalized relative URL: {imagePath} -> {normalizedUrl}");
#endif
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Normalized relative URL: {imagePath} -> {normalizedUrl}");
            
            if (Uri.TryCreate(normalizedUrl, UriKind.Absolute, out var normalizedUri) 
                && (normalizedUri.Scheme == Uri.UriSchemeHttp || normalizedUri.Scheme == Uri.UriSchemeHttps))
            {
                try
                {
                    var imageSource = new UriImageSource
                    {
                        Uri = normalizedUri,
                        CachingEnabled = true,
                        CacheValidity = TimeSpan.FromDays(7)
                    };
                    
#if ANDROID
                    Log.Info("StringToImageSourceConverter", $"[Convert] UriImageSource created for normalized URL: {normalizedUri}");
#endif
                    System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] UriImageSource created for normalized URL: {normalizedUri}");
                    
                    return imageSource;
                }
                catch (Exception ex)
                {
#if ANDROID
                    Log.Error("StringToImageSourceConverter", $"[Convert] Error creating UriImageSource for normalized URL '{normalizedUrl}': {ex.Message}");
#endif
                    System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Error creating UriImageSource for normalized URL '{normalizedUrl}': {ex.Message}");
                    return null;
                }
            }
        }

        // Это локальный файл из Resources - используем FileImageSource
        // В MAUI файлы из Resources/Images загружаются просто по имени файла (с расширением)
        System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Using FileImageSource for local file from Resources: {imagePath}");
#if ANDROID
        Log.Info("StringToImageSourceConverter", $"[Convert] Using FileImageSource for local file: {imagePath}");
#endif
        try
        {
            // В MAUI для файлов из Resources нужно использовать просто имя файла
            // ImageSource.FromFile() автоматически найдёт файл в Resources/Images/
            var imageSource = ImageSource.FromFile(imagePath);
            
#if ANDROID
            Log.Info("StringToImageSourceConverter", $"[Convert] FileImageSource created successfully for: {imagePath}");
#endif
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] FileImageSource created successfully for: {imagePath}");
            
            return imageSource;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Error loading local file '{imagePath}': {ex.Message}");
#if ANDROID
            Log.Error("StringToImageSourceConverter", $"[Convert] Error loading local file '{imagePath}': {ex.Message}");
#endif
            // Пробуем без расширения (на случай, если файл добавлен без расширения в проект)
            try
            {
                var fileNameWithoutExt = System.IO.Path.GetFileNameWithoutExtension(imagePath);
                var imageSource = ImageSource.FromFile(fileNameWithoutExt);
#if ANDROID
                Log.Info("StringToImageSourceConverter", $"[Convert] FileImageSource created without extension: {fileNameWithoutExt}");
#endif
                System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] FileImageSource created without extension: {fileNameWithoutExt}");
                return imageSource;
            }
            catch (Exception ex2)
            {
#if ANDROID
                Log.Error("StringToImageSourceConverter", $"[Convert] Error loading local file without extension: {ex2.Message}");
#endif
                System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Error loading local file without extension: {ex2.Message}");
                return null;
            }
        }
    }

    /// <summary>
    /// Нормализует URL изображения: если это относительный путь, добавляет базовый URL сервера
    /// </summary>
    private static string NormalizeImageUrl(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return imageUrl;

        // Если это уже абсолютный URL (начинается с http:// или https://), возвращаем как есть
        if (imageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) 
            || imageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] URL is already absolute: {imageUrl}");
            return imageUrl;
        }

        // Если это относительный путь (начинается с /), добавляем базовый URL сервера
        if (imageUrl.StartsWith("/"))
        {
            var baseUrl = ApiConfiguration.GetBaseUrl().TrimEnd('/');
            var fullUrl = $"{baseUrl}{imageUrl}";
            System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Normalized relative URL: {imageUrl} -> {fullUrl}");
            return fullUrl;
        }

        // Если путь не начинается с /, но и не является абсолютным URL,
        // предполагаем, что это тоже относительный путь от корня сервера
        var baseUrl2 = ApiConfiguration.GetBaseUrl().TrimEnd('/');
        var fullUrl2 = $"{baseUrl2}/{imageUrl.TrimStart('/')}";
        System.Diagnostics.Debug.WriteLine($"[StringToImageSourceConverter] Normalized path: {imageUrl} -> {fullUrl2}");
        return fullUrl2;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        // Обратная конверсия обычно не требуется
        return null;
    }
}

