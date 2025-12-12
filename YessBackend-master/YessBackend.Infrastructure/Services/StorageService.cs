using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YessBackend.Application.Services;

namespace YessBackend.Infrastructure.Services;

/// <summary>
/// Сервис файлового хранилища (заглушка)
/// Возвращает mock URLs вместо реального сохранения файлов
/// </summary>
public class StorageService : IStorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<StorageService> _logger;

    public StorageService(
        IConfiguration configuration,
        ILogger<StorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public Task<string> SaveFileAsync(IFormFile file, string folder, CancellationToken cancellationToken = default)
    {
        // Валидация формата файла
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"Недопустимый формат файла. Разрешены: {string.Join(", ", allowedExtensions)}");
        }

        // Валидация размера файла (максимум 10MB)
        const long maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.Length > maxFileSize)
        {
            throw new InvalidOperationException($"Размер файла превышает 10MB");
        }

        // Генерируем mock URL вместо реального сохранения
        var guid = Guid.NewGuid();
        var mockUrl = $"https://storage.example.com/{folder}/{guid}{extension}";
        
        _logger.LogInformation(
            "Mock file saved: {FileName} -> {Url} (actual file not saved, mock only)",
            file.FileName, mockUrl);

        return Task.FromResult(mockUrl);
    }

    public Task<bool> DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        // Заглушка - всегда возвращает успех
        _logger.LogInformation("Mock file delete: {Url} (actual file not deleted, mock only)", fileUrl);
        return Task.FromResult(true);
    }

    public Task<bool> FileExistsAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        // Заглушка - всегда возвращает true для mock URLs
        return Task.FromResult(true);
    }
}

