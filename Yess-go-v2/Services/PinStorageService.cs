using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;

namespace YessGoFront.Services;

public class PinStorageService
{
    private const string PinKey = "user_pin";

    public async Task SavePinAsync(string pin)
    {
        await SecureStorage.SetAsync(PinKey, pin);
    }

    public async Task<string?> GetPinAsync()
    {
        return await SecureStorage.GetAsync(PinKey);
    }

    public async Task<bool> ValidatePinAsync(string enteredPin)
    {
        var storedPin = await GetPinAsync();
        return storedPin == enteredPin;
    }

    public async Task ClearPinAsync()
    {
        SecureStorage.Remove(PinKey);
    }

    /// <summary>
    /// Validates the stored PIN (if any) and resets it when invalid.
    /// Rules:
    /// - If PIN is null/empty/whitespace → return false (do not store anything)
    /// - If PIN length < 4 or > 10 → clear and return false
    /// - Otherwise → consider valid and return true
    /// </summary>
    public async Task<bool> ValidateStoredPinOrReset()
    {
        string? storedPin = null;

        try
        {
            storedPin = await GetPinAsync();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[PinStorageService] Error reading stored PIN: {ex.Message}");
            // В случае любой ошибки считаем PIN повреждённым и очищаем
            SecureStorage.Remove(PinKey);
            return false;
        }

        Debug.WriteLine($"[PinStorageService] Stored PIN raw value: '{storedPin}' (length={storedPin?.Length ?? 0})");

        if (string.IsNullOrWhiteSpace(storedPin))
        {
            Debug.WriteLine("[PinStorageService] Stored PIN is null/empty/whitespace → treating as NO PIN");
            return false;
        }

        if (storedPin.Length < 4 || storedPin.Length > 10)
        {
            Debug.WriteLine("[PinStorageService] Stored PIN has invalid length → clearing");
            SecureStorage.Remove(PinKey);
            return false;
        }

        Debug.WriteLine("[PinStorageService] Stored PIN is considered valid");
        return true;
    }
}

