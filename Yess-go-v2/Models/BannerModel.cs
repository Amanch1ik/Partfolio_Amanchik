using System;

namespace YessGoFront.Models;

public class BannerModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Image { get; set; } = string.Empty;   // URL или путь к изображению
    public string PartnerName { get; set; } = string.Empty; // опционально
    public int? PartnerId { get; set; } // ID партнёра, если баннер связан с партнёром
    
    /// <summary>
    /// Проверяет, является ли Image URL-адресом
    /// </summary>
    public bool IsImageUrl => Uri.TryCreate(Image, UriKind.Absolute, out var uri) 
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
