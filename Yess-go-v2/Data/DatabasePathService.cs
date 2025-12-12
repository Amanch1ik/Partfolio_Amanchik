using System.IO;
using Microsoft.Maui.Storage;
using YessGoFront.Config;

namespace YessGoFront.Data;

/// <summary>
/// Сервис для получения строки подключения к базе данных
/// </summary>
public interface IDatabaseConnectionService
{
    string GetConnectionString();
    bool IsSqlLoggingEnabled();
}

/// <summary>
/// Реализация сервиса для получения строки подключения к SQLite
/// </summary>
public class DatabaseConnectionService : IDatabaseConnectionService
{
    private readonly AppSettings _settings;

    public DatabaseConnectionService(AppSettings settings)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
    }

    public string GetConnectionString()
    {
        // Если указана строка подключения в настройках, используем её
        if (!string.IsNullOrWhiteSpace(_settings.Database.ConnectionString))
        {
            return _settings.Database.ConnectionString;
        }

        // По умолчанию используем SQLite в локальной папке данных приложения
        var dbPath = Path.Combine(FileSystem.AppDataDirectory, "yessgo.db");
        // Включаем поддержку внешних ключей в SQLite
        return $"Data Source={dbPath};Foreign Keys=True";
    }

    public bool IsSqlLoggingEnabled()
    {
        return _settings.Database.EnableSqlLogging;
    }
}

