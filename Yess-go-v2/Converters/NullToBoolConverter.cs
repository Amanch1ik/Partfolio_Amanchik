using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Converts null to boolean (true if null)
    /// </summary>
    public class NullToBoolConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            return value == null;
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
