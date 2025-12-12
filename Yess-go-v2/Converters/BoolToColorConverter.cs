using System;
using System.Globalization;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
 public class BoolToColorConverter : IValueConverter
 {
 // parameter format: "TrueColor;FalseColor" e.g. "#FFFFFF;#0F6B53"
 public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
 {
 bool isTrue = false;
 if (value is bool b) isTrue = b;

 string trueColor = "#FFFFFF"; // default
 string falseColor = "#0F6B53"; // default

 if (parameter is string p)
 {
 var parts = p.Split(';');
 if (parts.Length >0 && !string.IsNullOrWhiteSpace(parts[0]))
 trueColor = parts[0];
 if (parts.Length >1 && !string.IsNullOrWhiteSpace(parts[1]))
 falseColor = parts[1];
 }

 try
 {
 var colorString = isTrue ? trueColor : falseColor;
 return Color.FromArgb(colorString);
 }
 catch
 {
 return Colors.Transparent;
 }
 }

 public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
 {
 throw new NotSupportedException();
 }
 }
}
