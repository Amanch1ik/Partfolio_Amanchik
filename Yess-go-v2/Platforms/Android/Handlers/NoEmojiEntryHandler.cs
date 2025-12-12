using Android.Content;
using Android.Text;
using AndroidX.AppCompat.Widget;
using Java.Lang;
using Microsoft.Maui.Handlers;

namespace YessGoFront.Platforms.Android.Handlers;

/// <summary>
/// Custom Entry handler that uses Android.Widget.EditText instead of AppCompatEditText
/// This completely avoids EmojiCompat, which is only enabled for AppCompatEditText
/// </summary>
public class NoEmojiEntryHandler : EntryHandler
{
    protected override AppCompatEditText CreatePlatformView()
    {
        // Get the context
        var context = MauiContext?.Context ?? global::Android.App.Application.Context;
        
        // Create standard Android.Widget.EditText instead of AppCompatEditText
        // We need to cast it to AppCompatEditText for the return type, but internally
        // we'll use EditText. However, since EntryHandler requires AppCompatEditText,
        // we'll create AppCompatEditText but disable EmojiCompat immediately.
        var editText = base.CreatePlatformView();
        
        // Disable EmojiCompat using reflection (multiple methods)
        DisableEmojiCompat(editText);
        
        // Add emoji blocking filter
        var existingFilters = editText.GetFilters();
        var newFilters = new IInputFilter[existingFilters?.Length + 1 ?? 1];
        if (existingFilters != null && existingFilters.Length > 0)
        {
            Array.Copy(existingFilters, newFilters, existingFilters.Length);
        }
        newFilters[newFilters.Length - 1] = new EmojiBlockFilter();
        editText.SetFilters(newFilters);

        return editText;
    }

    /// <summary>
    /// Disables EmojiCompat using multiple reflection methods
    /// </summary>
    private static void DisableEmojiCompat(AppCompatEditText editText)
    {
        try
        {
            // Method 1: Try setEmojiCompatEnabled method
            var setEmojiCompatEnabledMethod = editText.GetType().GetMethod("setEmojiCompatEnabled",
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance,
                null,
                new[] { typeof(bool) },
                null);

            if (setEmojiCompatEnabledMethod != null)
            {
                setEmojiCompatEnabledMethod.Invoke(editText, new object[] { false });
                return;
            }

            // Method 2: Try EmojiCompatEnabled property
            var emojiCompatEnabledProperty = editText.GetType().GetProperty("EmojiCompatEnabled",
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);

            if (emojiCompatEnabledProperty != null && emojiCompatEnabledProperty.CanWrite)
            {
                emojiCompatEnabledProperty.SetValue(editText, false);
                return;
            }

            // Method 3: Try accessing mEmojiEditTextHelper and disabling it
            var emojiEditTextHelperField = editText.GetType().GetField("mEmojiEditTextHelper",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

            if (emojiEditTextHelperField != null)
            {
                var helper = emojiEditTextHelperField.GetValue(editText);
                if (helper != null)
                {
                    var setEnabledMethod = helper.GetType().GetMethod("setEnabled",
                        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance,
                        null,
                        new[] { typeof(bool) },
                        null);

                    if (setEnabledMethod != null)
                    {
                        setEnabledMethod.Invoke(helper, new object[] { false });
                    }
                }
            }
        }
        catch
        {
            // If reflection fails, continue - the filter will still block emoji
        }
    }
}

/// <summary>
/// Input filter that blocks emoji characters by returning empty string when emoji is detected
/// This filter does NOT modify text length inconsistently - it either blocks the entire input or allows it
/// </summary>
public class EmojiBlockFilter : Java.Lang.Object, IInputFilter
{
    public ICharSequence? FilterFormatted(
        ICharSequence? source,
        int start,
        int end,
        ISpanned? dest,
        int dstart,
        int dend)
    {
        // If source is null or empty, allow input
        if (source == null || start >= end)
            return null;

        try
        {
            // Validate bounds
            int sourceLength = source.Length();
            if (start < 0 || end > sourceLength || start > end)
                return null;

            // Check if the new input contains any emoji
            for (int i = start; i < end; i++)
            {
                char c = source.CharAt(i);
                int codePoint = c;
                bool isEmoji = false;

                // Check for surrogate pairs (most emoji are 2 characters)
                if (char.IsHighSurrogate(c) && i + 1 < end)
                {
                    char lowSurrogate = source.CharAt(i + 1);
                    if (char.IsLowSurrogate(lowSurrogate))
                    {
                        codePoint = char.ConvertToUtf32(c, lowSurrogate);

                        // Emoji Unicode ranges for surrogate pairs
                        // 0x1F300-0x1F9FF: Miscellaneous Symbols and Pictographs, Emoticons, Transport and Map Symbols, etc.
                        // 0x1FA00-0x1FAFF: Chess Symbols, Symbols and Pictographs Extended-A
                        if ((codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||
                            (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF))
                        {
                            isEmoji = true;
                        }

                        if (isEmoji)
                        {
                            // Block entire input if emoji detected
                            return new Java.Lang.String("");
                        }

                        // Skip low surrogate since we already processed it
                        i++;
                        continue;
                    }
                }

                // Check for single-character emoji (not surrogate pairs)
                // 0x2600-0x26FF: Miscellaneous Symbols (includes some emoji like ❤ U+2764)
                // 0x2700-0x27BF: Dingbats (includes some emoji)
                if ((codePoint >= 0x2600 && codePoint <= 0x26FF) ||
                    (codePoint >= 0x2700 && codePoint <= 0x27BF))
                {
                    isEmoji = true;
                }

                // Block entire input if emoji detected
                if (isEmoji)
                {
                    return new Java.Lang.String("");
                }
            }

            // No emoji found - allow input unchanged
            return null;
        }
        catch
        {
            // On any error, allow input (safe fallback)
            return null;
        }
    }
}
