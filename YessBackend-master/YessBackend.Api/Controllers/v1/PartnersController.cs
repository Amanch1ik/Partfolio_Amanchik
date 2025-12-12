using Microsoft.AspNetCore.Mvc;
using YessBackend.Application.DTOs.Partner;
using YessBackend.Application.Services;
using AutoMapper;

namespace YessBackend.Api.Controllers.v1;

/// <summary>
/// Контроллер партнеров (алиас с множественным числом для совместимости с frontend)
/// Frontend использует /api/v1/partners/* вместо /api/v1/partner/*
/// Делегирует все запросы в PartnerController
/// </summary>
[ApiController]
[Route("api/v1/partners")]
[Tags("Partner")]
public class PartnersController : ControllerBase
{
    private readonly IPartnerService _partnerService;
    private readonly IMapper _mapper;
    private readonly ILogger<PartnersController> _logger;

    public PartnersController(
        IPartnerService partnerService,
        IMapper mapper,
        ILogger<PartnersController> logger)
    {
        _partnerService = partnerService;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Получить список партнеров
    /// GET /api/v1/partners/list
    /// </summary>
    [HttpGet("list")]
    [ProducesResponseType(typeof(List<PartnerResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PartnerResponseDto>>> GetPartners(
        [FromQuery] int? city_id = null,
        [FromQuery] string? category = null,
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null,
        [FromQuery] double? radius_km = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try
        {
            var partners = await _partnerService.GetPartnersAsync(
                cityId: city_id,
                category: category,
                latitude: latitude,
                longitude: longitude,
                radiusKm: radius_km,
                limit: limit,
                offset: offset);

            var response = partners.Select(p => _mapper.Map<PartnerResponseDto>(p)).ToList();
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения списка партнеров");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    /// <summary>
    /// Получить партнера по ID
    /// GET /api/v1/partners/{partner_id}
    /// </summary>
    [HttpGet("{partner_id}")]
    [ProducesResponseType(typeof(PartnerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerResponseDto>> GetPartner(int partner_id)
    {
        try
        {
            var partner = await _partnerService.GetPartnerByIdAsync(partner_id);
            if (partner == null)
            {
                return NotFound(new { error = "Партнер не найден" });
            }

            var response = _mapper.Map<PartnerResponseDto>(partner);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка получения партнера");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}

