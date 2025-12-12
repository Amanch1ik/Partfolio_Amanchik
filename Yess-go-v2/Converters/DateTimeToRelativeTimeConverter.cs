using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Converts DateTime to relative time string
    /// </summary>
    public class DateTimeToRelativeTimeConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is DateTime dateTime)
            {
                var now = DateTime.UtcNow;
                var diff = now - dateTime;

                if (diff.TotalMinutes < 1)
                    return "Только что";
                if (diff.TotalMinutes < 60)
                    return $"{(int)diff.TotalMinutes} мин назад";
                if (diff.TotalHours < 24)
                    return $"{(int)diff.TotalHours} ч назад";
                if (diff.TotalDays < 7)
                    return $"{(int)diff.TotalDays} д назад";
                
                return dateTime.ToString("dd.MM.yyyy");
            }
            return string.Empty;
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
