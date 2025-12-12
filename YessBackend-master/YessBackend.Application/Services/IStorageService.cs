using Microsoft.AspNetCore.Http;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса файлового хранилища
/// Заглушка - возвращает mock URLs
/// </summary>
public interface IStorageService
{
    Task<string> SaveFileAsync(IFormFile file, string folder, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default);
    Task<bool> FileExistsAsync(string fileUrl, CancellationToken cancellationToken = default);
}

