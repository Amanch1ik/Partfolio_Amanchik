using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Конвертирует прогресс (0..1) в ширину (double) относительно доступной ширины.
    /// parameter может быть числом (double) или строкой, парсится как double.
    /// </summary>
    public class ProgressToWidthConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is not double progress) return null;

            double maxWidth = 0;
            if (parameter is double d) maxWidth = d;
            else if (parameter is string s && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var p))
                maxWidth = p;

            if (maxWidth <= 0) return 0;
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;

            return progress * maxWidth;
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Обычно не требуется обратная конверсия.
            return null;
        }
    }
}
