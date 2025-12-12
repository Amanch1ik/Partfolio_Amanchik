using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using YessBackend.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace YessBackend.Infrastructure.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Регистрация DbContext
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' не найден");

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.MigrationsAssembly("YessBackend.Infrastructure");
            });
        });

        return services;
    }
}
