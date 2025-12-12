using System;
using System.Globalization;
using Microsoft.Maui.Controls;
using YessGoFront.Data.Entities;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Converts NotificationPriority to color string
    /// </summary>
    public class PriorityToColorConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is NotificationPriority priority)
            {
                return priority switch
                {
                    NotificationPriority.Urgent => "#DC2626",
                    NotificationPriority.High => "#F59E0B",
                    NotificationPriority.Normal => "#6B7280",
                    NotificationPriority.Low => "#9CA3AF",
                    _ => "#6B7280"
                };
            }
            return "#6B7280";
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
