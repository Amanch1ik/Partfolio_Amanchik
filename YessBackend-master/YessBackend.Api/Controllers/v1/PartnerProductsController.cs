using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YessBackend.Application.DTOs.PartnerProduct;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Data;
using AutoMapper;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер товаров партнеров
/// Соответствует /api/v1/partners/{partner_id}/products из Python API
/// </summary>
[ApiController]
[Route("api/v1/partners/{partner_id}/products")]
[Tags("Partner Products")]
public class PartnerProductsController : ControllerBase
{
    private readonly IPartnerProductService _productService;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<PartnerProductsController> _logger;

    public PartnerProductsController(
        IPartnerProductService productService,
        ApplicationDbContext context,
        IMapper mapper,
        ILogger<PartnerProductsController> logger)
    {
        _productService = productService;
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Получить список товаров/услуг партнера
    /// GET /api/v1/partners/{partner_id}/products
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PartnerProductListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PartnerProductListResponseDto>> GetPartnerProducts(
        [FromRoute] int partner_id,
        [FromQuery] string? category = null,
        [FromQuery] bool? is_available = null,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 20)
    {
        try
        {
            // Проверка существования партнера
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partner_id);

            if (partner == null)
            {
                return NotFound(new { error = "Партнер не найден" });
            }

            var result = await _productService.GetPartnerProductsAsync(
                partner_id, category, is_available, page, page_size);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения товаров партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить информацию о товаре/услуге
    /// GET /api/v1/partners/{partner_id}/products/{product_id}
    /// </summary>
    [HttpGet("{product_id}")]
    [ProducesResponseType(typeof(PartnerProductResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PartnerProductResponseDto>> GetPartnerProduct(
        [FromRoute] int partner_id,
        [FromRoute] int product_id)
    {
        try
        {
            var product = await _productService.GetPartnerProductByIdAsync(partner_id, product_id);
            if (product == null)
            {
                return NotFound(new { error = "Товар не найден" });
            }

            var result = MapToResponseDto(product);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения товара");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Создать новый товар/услугу для партнера
    /// POST /api/v1/partners/{partner_id}/products
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(PartnerProductResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PartnerProductResponseDto>> CreatePartnerProduct(
        [FromRoute] int partner_id,
        [FromBody] PartnerProductCreateDto createDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // Проверка прав (только владелец партнера или админ)
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partner_id);

            if (partner == null)
            {
                return NotFound(new { error = "Партнер не найден" });
            }

            // TODO: Проверить права доступа (владелец или админ)
            // if (partner.OwnerId != userId.Value && !IsAdmin(userId.Value))
            // {
            //     return Forbid("Недостаточно прав");
            // }

            var product = await _productService.CreatePartnerProductAsync(partner_id, createDto);
            var result = MapToResponseDto(product);

            return CreatedAtAction(
                nameof(GetPartnerProduct),
                new { partner_id, product_id = product.Id },
                result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка создания товара партнера");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка создания товара партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Обновить товар/услугу
    /// PUT /api/v1/partners/{partner_id}/products/{product_id}
    /// </summary>
    [HttpPut("{product_id}")]
    [Authorize]
    [ProducesResponseType(typeof(PartnerProductResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PartnerProductResponseDto>> UpdatePartnerProduct(
        [FromRoute] int partner_id,
        [FromRoute] int product_id,
        [FromBody] PartnerProductUpdateDto updateDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // TODO: Проверить права доступа (владелец или админ)
            var partner = await _context.Partners
                .FirstOrDefaultAsync(p => p.Id == partner_id);

            if (partner == null)
            {
                return NotFound(new { error = "Партнер не найден" });
            }

            var product = await _productService.UpdatePartnerProductAsync(partner_id, product_id, updateDto);
            var result = MapToResponseDto(product);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка обновления товара партнера");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обновления товара партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Удалить товар/услугу
    /// DELETE /api/v1/partners/{partner_id}/products/{product_id}
    /// </summary>
    [HttpDelete("{product_id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeletePartnerProduct(
        [FromRoute] int partner_id,
        [FromRoute] int product_id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Неверный токен" });
            }

            // TODO: Проверить права доступа (владелец или админ)
            await _productService.DeletePartnerProductAsync(partner_id, product_id);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ошибка удаления товара партнера");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления товара партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    private PartnerProductResponseDto MapToResponseDto(Domain.Entities.PartnerProduct product)
    {
        List<string>? images = null;
        if (!string.IsNullOrEmpty(product.Images))
        {
            try
            {
                images = System.Text.Json.JsonSerializer.Deserialize<List<string>>(product.Images);
            }
            catch
            {
                // Если не удалось распарсить, оставляем null
            }
        }

        return new PartnerProductResponseDto
        {
            Id = product.Id,
            PartnerId = product.PartnerId,
            Name = product.Name,
            NameKg = product.NameKg,
            NameRu = product.NameRu,
            Description = product.Description,
            Price = product.Price,
            Category = product.Category,
            ImageUrl = product.ImageUrl,
            Images = images,
            IsAvailable = product.IsAvailable,
            StockQuantity = product.StockQuantity,
            Sku = product.Sku,
            DiscountPercent = product.DiscountPercent,
            OriginalPrice = product.OriginalPrice,
            SortOrder = product.SortOrder,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}

