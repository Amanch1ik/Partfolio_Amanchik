using System;
using System.Collections.Generic;
using System.Text.Json;

namespace YessGoFront.Infrastructure.Auth;

/// <summary>
/// Простая утилита для декодирования JWT токенов (без проверки подписи)
/// </summary>
public static class JwtHelper
{
    /// <summary>
    /// Декодировать payload JWT токена без проверки подписи
    /// </summary>
    public static T? DecodePayload<T>(string token) where T : class
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        try
        {
            // JWT формат: header.payload.signature
            var parts = token.Split('.');
            if (parts.Length != 3)
                return null;

            var payload = parts[1];
            
            // Добавляем padding если нужно (base64url)
            var padding = 4 - payload.Length % 4;
            if (padding != 4)
                payload += new string('=', padding);

            // Заменяем - и _ обратно на + и /
            payload = payload.Replace('-', '+').Replace('_', '/');

            var bytes = Convert.FromBase64String(payload);
            var json = System.Text.Encoding.UTF8.GetString(bytes);
            
            return JsonSerializer.Deserialize<T>(json);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Получить user_id из JWT токена
    /// </summary>
    public static int? GetUserId(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
            return null;

        var payload = DecodePayload<Dictionary<string, JsonElement>>(accessToken);
        if (payload == null)
            return null;

        // Бэкенд хранит user_id в поле "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" или "sub"
        if (payload.TryGetValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", out var nameIdElement))
        {
            var nameId = nameIdElement.GetString();
            if (int.TryParse(nameId, out var userId))
                return userId;
        }

        // Также проверяем "sub" (subject) как fallback
        if (payload.TryGetValue("sub", out var subElement))
        {
            var sub = subElement.GetString();
            if (int.TryParse(sub, out var userId))
                return userId;
        }

        // Также проверяем "user_id"
        if (payload.TryGetValue("user_id", out var userIdElement))
        {
            if (userIdElement.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                var userIdStr = userIdElement.GetString();
                if (int.TryParse(userIdStr, out var userId))
                    return userId;
            }
            else if (userIdElement.ValueKind == System.Text.Json.JsonValueKind.Number)
            {
                return userIdElement.GetInt32();
            }
        }

        return null;
    }

    /// <summary>
    /// Получить телефон из JWT токена
    /// </summary>
    public static string? GetPhone(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
            return null;

        var payload = DecodePayload<Dictionary<string, JsonElement>>(accessToken);
        if (payload == null)
            return null;

        // Проверяем поле "phone"
        if (payload.TryGetValue("phone", out var phoneElement))
        {
            return phoneElement.GetString();
        }

        // Проверяем поле "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        if (payload.TryGetValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", out var nameElement))
        {
            return nameElement.GetString();
        }

        return null;
    }

    /// <summary>
    /// Проверить, не истек ли JWT токен
    /// </summary>
    public static bool IsTokenValid(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
            return false;

        try
        {
            var payload = DecodePayload<Dictionary<string, JsonElement>>(accessToken);
            if (payload == null)
                return false;

            // Проверяем поле "exp" (expiration time)
            if (payload.TryGetValue("exp", out var expElement))
            {
                long exp;
                if (expElement.ValueKind == JsonValueKind.Number)
                {
                    exp = expElement.GetInt64();
                }
                else if (expElement.ValueKind == JsonValueKind.String)
                {
                    if (!long.TryParse(expElement.GetString(), out exp))
                        return false;
                }
                else
                {
                    return false;
                }

                var expTime = DateTimeOffset.FromUnixTimeSeconds(exp);
                var now = DateTimeOffset.UtcNow;

                // Токен валиден, если время истечения больше текущего времени (с запасом 1 минута)
                return expTime > now.AddMinutes(1);
            }

            // Если нет поля exp, считаем токен валидным (но это нестандартно)
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Получить оставшееся время жизни токена в минутах
    /// </summary>
    public static int GetTokenRemainingMinutes(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
            return 0;

        try
        {
            var payload = DecodePayload<Dictionary<string, JsonElement>>(accessToken);
            if (payload == null)
                return 0;

            // Проверяем поле "exp" (expiration time)
            if (payload.TryGetValue("exp", out var expElement))
            {
                long exp;
                if (expElement.ValueKind == JsonValueKind.Number)
                {
                    exp = expElement.GetInt64();
                }
                else if (expElement.ValueKind == JsonValueKind.String)
                {
                    if (!long.TryParse(expElement.GetString(), out exp))
                        return 0;
                }
                else
                {
                    return 0;
                }

                var expTime = DateTimeOffset.FromUnixTimeSeconds(exp);
                var now = DateTimeOffset.UtcNow;
                var remainingTime = expTime - now;

                // Возвращаем оставшееся время в минутах (минимум 0)
                return Math.Max(0, (int)remainingTime.TotalMinutes);
            }

            return 0;
        }
        catch
        {
            return 0;
        }
    }
}

