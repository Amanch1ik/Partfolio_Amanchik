namespace YessGoFront.Tests;

/// <summary>
/// Вспомогательный класс для тестирования логики определения emoji
/// Дублирует логику из EmojiTextWatcher для тестирования
/// </summary>
public static class EmojiDetectionHelper
{
    /// <summary>
    /// Проверяет, содержит ли строка emoji
    /// </summary>
    public static bool ContainsEmoji(string text)
    {
        if (string.IsNullOrEmpty(text))
            return false;

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            int codePoint = c;
            
            // Проверяем суррогатные пары (emoji в диапазоне 0x1F000+ всегда в суррогатных парах)
            if (char.IsHighSurrogate(c) && i + 1 < text.Length)
            {
                char lowSurrogate = text[i + 1];
                if (char.IsLowSurrogate(lowSurrogate))
                {
                    codePoint = char.ConvertToUtf32(c, lowSurrogate);
                    
                    // Emoji диапазоны Unicode для суррогатных пар
                    if ((codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||  // Основные emoji и пиктограммы
                        (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF))     // Расширенные emoji
                    {
                        return true;
                    }
                    
                    i++; // Пропускаем низкий суррогат
                    continue;
                }
            }
            
            // Проверяем обычные символы в диапазоне emoji (не суррогатные пары)
            // Это символы, которые могут быть emoji, но представлены одним символом
            if ((codePoint >= 0x2600 && codePoint <= 0x26FF) ||    // Разные символы (включая ❤ U+2764)
                (codePoint >= 0x2700 && codePoint <= 0x27BF))      // Разные символы
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Удаляет все emoji из строки
    /// </summary>
    public static string RemoveEmoji(string text)
    {
        if (string.IsNullOrEmpty(text))
            return text;

        var result = new System.Text.StringBuilder(text.Length);
        
        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            int codePoint = c;
            bool isEmoji = false;
            
            // Проверяем суррогатные пары
            if (char.IsHighSurrogate(c) && i + 1 < text.Length)
            {
                char lowSurrogate = text[i + 1];
                if (char.IsLowSurrogate(lowSurrogate))
                {
                    codePoint = char.ConvertToUtf32(c, lowSurrogate);
                    
                    // Emoji диапазоны Unicode для суррогатных пар
                    if ((codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||  // Основные emoji и пиктограммы
                        (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF))     // Расширенные emoji
                    {
                        // Пропускаем emoji (не добавляем в результат)
                        i++; // Пропускаем низкий суррогат
                        continue;
                    }
                    else
                    {
                        // Не emoji - добавляем оба символа
                        result.Append(c);
                        result.Append(lowSurrogate);
                        i++; // Пропускаем низкий суррогат
                        continue;
                    }
                }
            }
            
            // Проверяем обычные символы в диапазоне emoji
            if ((codePoint >= 0x2600 && codePoint <= 0x26FF) ||    // Разные символы
                (codePoint >= 0x2700 && codePoint <= 0x27BF))      // Разные символы
            {
                isEmoji = true;
            }
            
            // Если не emoji, добавляем символ
            if (!isEmoji)
            {
                result.Append(c);
            }
        }

        return result.ToString();
    }
}
