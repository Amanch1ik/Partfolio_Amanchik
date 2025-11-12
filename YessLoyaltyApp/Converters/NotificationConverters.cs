using System.Globalization;

namespace YessLoyaltyApp.Converters
{
    // Конвертер цвета в зависимости от статуса прочтения
    public class ReadStatusColorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is bool isRead)
            {
                return isRead ? Color.FromArgb("#808080") : Color.FromArgb("#000000");
            }
            return Color.FromArgb("#000000");
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    // Конвертер цвета в зависимости от типа уведомления
    public class NotificationTypeColorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is NotificationType type)
            {
                return type switch
                {
                    NotificationType.Promotion => Color.FromArgb("#FFA500"),   // Оранжевый
                    NotificationType.Transaction => Color.FromArgb("#4CAF50"), // Зеленый
                    NotificationType.Bonus => Color.FromArgb("#2196F3"),       // Синий
                    NotificationType.Security => Color.FromArgb("#F44336"),    // Красный
                    _ => Color.FromArgb("#9E9E9E")                             // Серый
                };
            }
            return Color.FromArgb("#9E9E9E");
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    // Конвертер для форматирования даты уведомления
    public class NotificationDateConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is DateTime dateTime)
            {
                var now = DateTime.UtcNow;
                var diff = now - dateTime;

                return diff.TotalDays switch
                {
                    < 1 => diff.TotalHours switch
                    {
                        < 1 => $"{diff.Minutes} мин. назад",
                        < 24 => $"{(int)diff.TotalHours} ч. назад",
                        _ => dateTime.ToString("HH:mm")
                    },
                    < 7 => $"{(int)diff.TotalDays} дн. назад",
                    _ => dateTime.ToString("dd MMM")
                };
            }
            return string.Empty;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
