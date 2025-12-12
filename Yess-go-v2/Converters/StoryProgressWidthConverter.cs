using System;
using System.Collections;
using System.Globalization;
using Microsoft.Maui.Controls;

namespace YessGoFront.Converters
{
    /// <summary>
    /// Конвертер для вычисления ширины прогресс-бара сторис (как в Instagram)
    /// Учитывает прогресс сегмента, общее количество сегментов и доступную ширину
    /// </summary>
    public class StoryProgressWidthConverter : IMultiValueConverter
    {
        public object? Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            if (values == null || values.Length < 3)
                return 0.0;

            // values[0] - прогресс текущего сегмента (0..1)
            if (values[0] is not double progress)
                return 0.0;

            // values[1] - количество сегментов
            int segmentCount = 1;
            if (values[1] is int count && count > 0)
            {
                segmentCount = count;
            }
            else if (values[1] is long longCount && longCount > 0)
            {
                segmentCount = (int)longCount;
            }

            // values[2] - ширина контейнера ProgressTimelineContainer
            double containerWidth = 0.0;
            if (values[2] is double width && width > 0)
            {
                containerWidth = width;
            }
            else if (values[2] == BindableProperty.UnsetValue)
            {
                return 0.0;
            }

            if (containerWidth <= 0 || segmentCount <= 0)
                return 0.0;

            // Ограничиваем прогресс от 0 до 1
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;

            // Вычисляем ширину одного сегмента
            // Учитываем отступы: Padding="12,8" означает 12px слева и справа = 24px всего
            // Spacing="4" между сегментами: (segmentCount - 1) * 4
            double totalPadding = 24; // 12px слева + 12px справа
            double totalSpacing = (segmentCount - 1) * 4; // spacing между сегментами
            double usableWidth = containerWidth - totalPadding - totalSpacing;
            
            if (usableWidth <= 0)
                return 0.0;
            
            // Ширина одного сегмента
            double segmentWidth = usableWidth / segmentCount;
            
            // Проверяем, что segmentWidth валиден
            if (segmentWidth <= 0)
                return 0.0;

            // Вычисляем ширину прогресса для текущего сегмента
            double progressWidth = progress * segmentWidth;
            
            // Если прогресс > 0, но вычисленная ширина очень мала, устанавливаем минимальную ширину для видимости
            // Это предотвращает ситуацию, когда прогресс-бар не виден из-за округления
            // Но только если это не приведет к превышению ширины сегмента
            if (progress > 0 && progressWidth < 1.0 && segmentWidth > 1.0)
            {
                progressWidth = Math.Max(progressWidth, 1.0);
            }
            
            // Убеждаемся, что ширина не превышает ширину сегмента
            double result = Math.Min(progressWidth, segmentWidth);
            
            // Дополнительная проверка: если прогресс = 0, ширина должна быть 0
            if (progress <= 0)
                result = 0.0;
            
            return result;
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        {
            // Обратная конверсия не требуется
            return Array.Empty<object>();
        }
    }
}

