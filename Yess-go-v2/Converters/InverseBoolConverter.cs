using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    public class InverseBoolConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is bool b) return !b;
            // Если значение не bool, возвращаем false (по умолчанию)
            return false;
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is bool b) return !b;
            // Если значение не bool, возвращаем false (по умолчанию)
            return false;
        }
    }
}
