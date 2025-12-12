using YessBackend.Application.DTOs.PartnerProduct;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса товаров партнеров
/// </summary>
public interface IPartnerProductService
{
    Task<PartnerProductListResponseDto> GetPartnerProductsAsync(
        int partnerId,
        string? category = null,
        bool? isAvailable = null,
        int page = 1,
        int pageSize = 20);
    Task<PartnerProduct?> GetPartnerProductByIdAsync(int partnerId, int productId);
    Task<PartnerProduct> CreatePartnerProductAsync(int partnerId, PartnerProductCreateDto createDto);
    Task<PartnerProduct> UpdatePartnerProductAsync(int partnerId, int productId, PartnerProductUpdateDto updateDto);
    Task DeletePartnerProductAsync(int partnerId, int productId);
}

