using System;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters;

/// <summary>
/// Конвертер для проверки, что значение не null
/// Возвращает true, если значение не null, false - если null
/// </summary>
public class IsNotNullConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string str)
        {
            return !string.IsNullOrWhiteSpace(str);
        }
        
        // Для nullable типов - используем проверку через Nullable.GetUnderlyingType
        if (value != null)
        {
            var valueType = value.GetType();
            var underlyingType = Nullable.GetUnderlyingType(valueType);
            
            // Если это nullable decimal или decimal
            if (underlyingType == typeof(decimal) || valueType == typeof(decimal))
            {
                try
                {
                    var decimalValue = System.Convert.ToDecimal(value);
                    return decimalValue > 0;
                }
                catch
                {
                    return false;
                }
            }
            
            // Если это nullable int или int
            if (underlyingType == typeof(int) || valueType == typeof(int))
            {
                try
                {
                    var intValue = System.Convert.ToInt32(value);
                    return intValue > 0;
                }
                catch
                {
                    return false;
                }
            }
        }
        
        return value != null;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
