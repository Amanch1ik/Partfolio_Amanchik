using Xunit;

namespace YessGoFront.Tests;

/// <summary>
/// Модульные тесты для проверки блокировки emoji
/// Тестирует логику определения и удаления emoji из текста
/// </summary>
public class EmojiFilterTests
{
    [Theory]
    [InlineData("Hello World", false)]
    [InlineData("123456", false)]
    [InlineData("Test@example.com", false)]
    [InlineData("Привет мир", false)]
    [InlineData("Hello 😀 World", true)]
    [InlineData("😀", true)]
    [InlineData("👍", true)]
    [InlineData("❤", true)]  // U+2764 без селектора
    [InlineData("🎉", true)]
    [InlineData("🚀", true)]
    [InlineData("Test 😊 Test", true)]
    [InlineData("Multiple 😀👍 emoji", true)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ContainsEmoji_ShouldDetectEmojiCorrectly(string? text, bool expected)
    {
        // Arrange & Act
        bool result = EmojiDetectionHelper.ContainsEmoji(text ?? string.Empty);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Hello World", "Hello World")]
    [InlineData("123456", "123456")]
    [InlineData("Test@example.com", "Test@example.com")]
    [InlineData("Привет мир", "Привет мир")]
    [InlineData("Hello 😀 World", "Hello  World")]
    [InlineData("😀", "")]
    [InlineData("👍", "")]
    [InlineData("❤", "")]  // U+2764 без селектора
    [InlineData("🎉", "")]
    [InlineData("🚀", "")]
    [InlineData("Test 😊 Test", "Test  Test")]
    [InlineData("Multiple 😀👍 emoji", "Multiple  emoji")]
    [InlineData("Text with 😀 and 👍", "Text with  and ")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void RemoveEmoji_ShouldRemoveAllEmoji(string? text, string expected)
    {
        // Arrange & Act
        string result = EmojiDetectionHelper.RemoveEmoji(text ?? string.Empty);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void ContainsEmoji_ShouldHandleVariousEmojiTypes()
    {
        // Arrange - различные типы emoji
        var emojis = new[]
        {
            "😀",      // Основные emoji (0x1F600-0x1F64F)
            "👍",      // Основные emoji
            "❤",       // Разные символы (0x2600-0x26FF) - U+2764
            "🎉",      // Разные символы и пиктограммы (0x1F300-0x1F5FF)
            "🚀",      // Транспорт и карты (0x1F680-0x1F6FF)
            "🔥",      // Разные символы
            "💯",      // Разные символы
        };

        // Act & Assert
        foreach (var emoji in emojis)
        {
            bool contains = EmojiDetectionHelper.ContainsEmoji(emoji);
            Assert.True(contains, $"Emoji '{emoji}' should be detected");
        }
    }

    [Fact]
    public void RemoveEmoji_ShouldPreserveNonEmojiCharacters()
    {
        // Arrange
        string text = "Hello  123  Test@example.com Привет";  // Двойные пробелы после удаления emoji
        string textWithEmoji = "Hello 😀 123 👍 Test@example.com Привет";

        // Act
        string removed = EmojiDetectionHelper.RemoveEmoji(textWithEmoji);

        // Assert
        Assert.Equal(text, removed);
    }

    [Fact]
    public void RemoveEmoji_ShouldHandleMultipleConsecutiveEmojis()
    {
        // Arrange
        string textWithEmojis = "😀👍🎉🚀";
        string expected = "";

        // Act
        string result = EmojiDetectionHelper.RemoveEmoji(textWithEmojis);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void RemoveEmoji_ShouldHandleMixedContent()
    {
        // Arrange
        string text = "Start 😀 middle 👍 end";
        string expected = "Start  middle  end";

        // Act
        string result = EmojiDetectionHelper.RemoveEmoji(text);

        // Assert
        Assert.Equal(expected, result);
        Assert.DoesNotContain("😀", result);
        Assert.DoesNotContain("👍", result);
    }

    [Fact]
    public void ContainsEmoji_ShouldNotDetectRegularUnicodeCharacters()
    {
        // Arrange - обычные Unicode символы, которые не являются emoji
        var nonEmojis = new[]
        {
            "A",
            "а",
            "中",
            "あ",
            "©",
            "®",
            "™",
            "€",
            "£",
            "¥",
        };

        // Act & Assert
        foreach (var text in nonEmojis)
        {
            bool contains = EmojiDetectionHelper.ContainsEmoji(text);
            Assert.False(contains, $"Character '{text}' should NOT be detected as emoji");
        }
    }

    [Fact]
    public void RemoveEmoji_ShouldHandleSurrogatePairsCorrectly()
    {
        // Arrange - текст с суррогатными парами (emoji)
        string text = "Test 😀👍 Test";
        
        // Act
        string result = EmojiDetectionHelper.RemoveEmoji(text);

        // Assert
        Assert.Equal("Test  Test", result);
        // Проверяем, что суррогатные пары обработаны корректно
        Assert.DoesNotContain("😀", result);
        Assert.DoesNotContain("👍", result);
    }

    [Fact]
    public void ContainsEmoji_ShouldHandleEdgeCases()
    {
        // Arrange & Act & Assert
        Assert.False(EmojiDetectionHelper.ContainsEmoji(" "));
        Assert.False(EmojiDetectionHelper.ContainsEmoji("\t"));
        Assert.False(EmojiDetectionHelper.ContainsEmoji("\n"));
        Assert.False(EmojiDetectionHelper.ContainsEmoji("!@#$%^&*()"));
        Assert.True(EmojiDetectionHelper.ContainsEmoji("😀"));
        Assert.True(EmojiDetectionHelper.ContainsEmoji("  😀  "));
    }

    [Fact]
    public void RemoveEmoji_ShouldNotModifyTextWithoutEmoji()
    {
        // Arrange
        string originalText = "This is a test string with no emoji 123 !@#";

        // Act
        string result = EmojiDetectionHelper.RemoveEmoji(originalText);

        // Assert
        Assert.Equal(originalText, result);
    }
}

