using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Конвертер для вычисления ширины прогресс-бара на основе прогресса (0..1) и доступной ширины
    /// </summary>
    public class ProgressToWidthMultiConverter : IMultiValueConverter
    {
        public object? Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            if (values == null || values.Length < 2)
                return 0.0;

            if (values[0] is not double progress)
                return 0.0;

            // Получаем доступную ширину (может быть double или UnsetValue)
            double availableWidth = 0.0;
            if (values[1] is double width && width > 0)
            {
                availableWidth = width;
            }
            else if (values[1] == BindableProperty.UnsetValue)
            {
                // Если ширина еще не установлена, возвращаем 0
                return 0.0;
            }

            if (availableWidth <= 0)
                return 0.0;

            // Ограничиваем прогресс от 0 до 1
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;

            return progress * availableWidth;
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        {
            // Обратная конверсия не требуется
            return Array.Empty<object>();
        }
    }
}

