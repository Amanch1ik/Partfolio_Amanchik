using System;
using System.Threading.Tasks;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;

namespace YessGoFront.Infrastructure.Ui
{
    public static class AppUiHelper
    {
        public static Page GetCurrentPageOrThrow()
        {
            var page = Application.Current?.Windows.Count > 0
                ? Application.Current.Windows[0]?.Page
                : null;

            return page ?? throw new InvalidOperationException("Нет активного окна/страницы приложения.");
        }

        public static Page? TryGetCurrentPage()
        {
            return Application.Current?.Windows.Count > 0
                ? Application.Current.Windows[0]?.Page
                : null;
        }

        /// <summary>
        /// Безопасная навигация на страницу логина при потере авторизации.
        /// Не выбрасывает исключения и всегда выполняется на главном потоке.
        /// </summary>
        public static async Task NavigateToLoginPageAsync(bool animated = true)
        {
            try
            {
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    try
                    {
                        if (Shell.Current != null)
                        {
                            await Shell.Current.GoToAsync("///login", animate: animated);
                        }
                    }
                    catch
                    {
                        // Игнорируем ошибки навигации, чтобы не уронить приложение
                    }
                });
            }
            catch
            {
                // Игнорируем ошибки MainThread, чтобы не уронить приложение
            }
        }
    }
}
