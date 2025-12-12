using Microsoft.Extensions.DependencyInjection;

namespace YessBackend.Application.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Регистрация AutoMapper
        services.AddAutoMapper(typeof(ServiceExtensions));

        // Регистрация FluentValidation
        // TODO: services.AddValidatorsFromAssemblyContaining<ServiceExtensions>();

        return services;
    }
}
