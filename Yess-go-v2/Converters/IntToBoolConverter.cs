using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Converts integer to boolean (true if > 0)
    /// </summary>
    public class IntToBoolConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is int intValue)
                return intValue > 0;
            return false;
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
