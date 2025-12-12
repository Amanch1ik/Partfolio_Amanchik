using Android.Text;

namespace YessGoFront.Platforms.Android.Emoji;

public class EmojiBlockWatcher : Java.Lang.Object, ITextWatcher
{
    private bool _isUpdating;

    public void AfterTextChanged(IEditable? s)
    {
        if (s == null || _isUpdating)
            return;

        _isUpdating = true;

        try
        {
            int length = s.Length();

            for (int i = length - 1; i >= 0; i--)
            {
                char c = s.CharAt(i);

                // Проверка суррогатной пары (emoji)
                if (char.IsHighSurrogate(c) && i - 1 >= 0)
                {
                    char low = s.CharAt(i - 1);

                    if (char.IsLowSurrogate(low))
                    {
                        int codePoint = char.ConvertToUtf32(low, c);

                        if (IsEmoji(codePoint))
                        {
                            // Удаляем пару
                            s.Delete(i - 1, i + 1);
                            i--;
                            continue;
                        }
                    }
                }
                else
                {
                    // Одиночный символ
                    if (IsEmoji(c))
                    {
                        s.Delete(i, i + 1);
                    }
                }
            }
        }
        catch
        {
        }
        finally
        {
            _isUpdating = false;
        }
    }

    public void BeforeTextChanged(Java.Lang.ICharSequence? s, int start, int count, int after) { }
    public void OnTextChanged(Java.Lang.ICharSequence? s, int start, int before, int count) { }

    private bool IsEmoji(int codePoint)
    {
        return
            (codePoint >= 0x1F000 && codePoint <= 0x1FAFF) ||   // большинство emoji
            (codePoint >= 0x2600 && codePoint <= 0x27BF);       // символы типа ☀☔
    }

    private bool IsEmoji(char c)
    {
        return
            (c >= 0x2600 && c <= 0x27BF); // одиночные emoji-символы
    }
}
