using YessGoFront.Models;

namespace YessGoFront.Services.Domain;

/// <summary>
/// Domain сервис для работы с кошельком (бизнес-логика)
/// </summary>
public interface IWalletService
{
    Task<decimal> GetBalanceAsync(CancellationToken ct = default);
    Task<IReadOnlyList<PurchaseDto>> GetTransactionHistoryAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);
    Task<PurchaseDto> GetTransactionByIdAsync(string id, CancellationToken ct = default);
}

