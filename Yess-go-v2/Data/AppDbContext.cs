using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YessGoFront.Data.Entities;

namespace YessGoFront.Data;

/// <summary>
/// Контекст базы данных приложения
/// </summary>
public class AppDbContext : DbContext
{
    private readonly string _connectionString;
    private readonly bool _enableSqlLogging;
    private readonly ILogger<AppDbContext>? _logger;

    public AppDbContext(
        string connectionString,
        bool enableSqlLogging = false,
        ILogger<AppDbContext>? logger = null)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _enableSqlLogging = enableSqlLogging;
        _logger = logger;
    }

    // DbSets для сущностей
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Wallet> Wallets { get; set; } = null!;
    public DbSet<City> Cities { get; set; } = null!;
    public DbSet<Partner> Partners { get; set; } = null!;
    public DbSet<PartnerLocation> PartnerLocations { get; set; } = null!;
    public DbSet<Transaction> Transactions { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<Promotion> Promotions { get; set; } = null!;

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlite(_connectionString);

        // Включить логирование SQL запросов
        if (_enableSqlLogging || 
#if DEBUG
            true
#else
            false
#endif
            )
        {
            optionsBuilder.LogTo(
                message => _logger?.LogDebug(message),
                LogLevel.Information);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Игнорируем JSON поля, которые не поддерживаются SQLite напрямую
        // Эти поля не используются в локальном кэшировании данных пользователя
        modelBuilder.Entity<Notification>()
            .Ignore(n => n.Data);

        modelBuilder.Entity<User>()
            .Ignore(u => u.DeviceTokens);

        modelBuilder.Entity<Partner>()
            .Ignore(p => p.SocialMedia);

        modelBuilder.Entity<PartnerLocation>()
            .Ignore(pl => pl.WorkingHours);
    }

    /// <summary>
    /// Удалить базу данных (для тестирования/очистки)
    /// ⚠️ ОПАСНО: Удаляет всю базу данных!
    /// </summary>
    public async Task EnsureDeletedAsync()
    {
        await Database.EnsureDeletedAsync();
        _logger?.LogWarning("Database deleted!");
    }

    /// <summary>
    /// Создать базу данных и применить миграции
    /// </summary>
    public async Task EnsureCreatedAsync()
    {
        await Database.EnsureCreatedAsync();
        _logger?.LogInformation("Database created/verified");
    }

    /// <summary>
    /// Применить миграции
    /// </summary>
    public async Task MigrateAsync()
    {
        if ((await Database.GetPendingMigrationsAsync()).Any())
        {
            await Database.MigrateAsync();
            _logger?.LogInformation("Database migrations applied");
        }
        else
        {
            _logger?.LogDebug("No pending migrations");
        }
    }
}

