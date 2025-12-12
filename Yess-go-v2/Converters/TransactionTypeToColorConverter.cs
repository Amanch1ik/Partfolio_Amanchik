using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters;

public class TransactionTypeToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not string type)
            return Colors.Gray;

        type = type.ToLowerInvariant();

        return type switch
        {
            "topup" => Color.FromArgb("#16A34A"),      // пополнение
            "bonus" => Color.FromArgb("#16A34A"),      // бонусы
            "refund" => Color.FromArgb("#16A34A"),     // возвраты
            "discount" => Color.FromArgb("#DC2626"),   // списания
            "payment" => Color.FromArgb("#DC2626"),    // оплата
            _ => Color.FromArgb("#6B7280")
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
