using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Plugin.Fingerprint;
using Plugin.Fingerprint.Abstractions;

namespace YessGoFront.Services;

public class BiometricService
{
    public async Task<bool> TryAuthenticateAsync(string reason = "Вход в приложение")
    {
        var isAvailable = await CrossFingerprint.Current.IsAvailableAsync();
        if (!isAvailable)
            return false;

        var config = new AuthenticationRequestConfiguration("Аутентификация", reason);
        var result = await CrossFingerprint.Current.AuthenticateAsync(config);

        return result.Authenticated;
    }

    // Алиас для совместимости с AuthService
    public async Task<bool> AuthenticateAsync(string reason = "Вход в приложение")
    {
        return await TryAuthenticateAsync(reason);
    }
}
