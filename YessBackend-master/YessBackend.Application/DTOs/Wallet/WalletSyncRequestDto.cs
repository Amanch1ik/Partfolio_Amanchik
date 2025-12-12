using System.Text.Json.Serialization;

namespace YessBackend.Application.DTOs.Wallet;

/// <summary>
/// DTO для запроса синхронизации кошелька
/// </summary>
public class WalletSyncRequestDto
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
}

/// <summary>
/// DTO для ответа синхронизации кошелька
/// </summary>
public class WalletSyncResponseDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("yescoin_balance")]
    public decimal YescoinBalance { get; set; }

    [JsonPropertyName("last_updated")]
    public DateTime LastUpdated { get; set; }

    [JsonPropertyName("has_changes")]
    public bool HasChanges { get; set; }
}

