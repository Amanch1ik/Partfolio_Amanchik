using System;
using Microsoft.Extensions.Configuration;

namespace YessLoyaltyApp.Services
{
    public enum AppEnvironment
    {
        Development,
        Staging,
        Production
    }

    public interface IEnvironmentService
    {
        AppEnvironment CurrentEnvironment { get; }
        string GetApiBaseUrl();
        bool IsDevelopment();
        bool IsStaging();
        bool IsProduction();
    }

    public class EnvironmentService : IEnvironmentService
    {
        private readonly IConfiguration _configuration;
        
        public AppEnvironment CurrentEnvironment { get; private set; }

        public EnvironmentService(IConfiguration configuration)
        {
            _configuration = configuration;
            
            // Определение текущей среды
            var envName = Environment.GetEnvironmentVariable("YESS_ENVIRONMENT") 
                          ?? _configuration["Environment"] 
                          ?? "Development";

            CurrentEnvironment = Enum.TryParse<AppEnvironment>(envName, out var env) 
                ? env 
                : AppEnvironment.Development;
        }

        public string GetApiBaseUrl()
        {
            return CurrentEnvironment switch
            {
                AppEnvironment.Development => "http://localhost:8000/api/",
                AppEnvironment.Staging => "https://staging-api.yessloyalty.com/api/",
                AppEnvironment.Production => "https://api.yessloyalty.com/api/",
                _ => throw new NotSupportedException($"Unsupported environment: {CurrentEnvironment}")
            };
        }

        public bool IsDevelopment() => CurrentEnvironment == AppEnvironment.Development;
        public bool IsStaging() => CurrentEnvironment == AppEnvironment.Staging;
        public bool IsProduction() => CurrentEnvironment == AppEnvironment.Production;
    }
}
