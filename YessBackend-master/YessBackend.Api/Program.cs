using System.Net;
using System.Text;
using System.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using YessBackend.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using YessBackend.Application.Extensions;
using YessBackend.Infrastructure.Extensions;
using YessBackend.Application.Services;
using YessBackend.Infrastructure.Services;
using YessBackend.Api.Middleware;
using YessBackend.Domain.Entities;
using System.Text.Json.Serialization;

// Глобальные настройки для работы с DateTime в Npgsql:
// Разрешаем старое поведение с Kind=Unspecified, чтобы не падать на timestamp with time zone
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);

var builder = WebApplication.CreateBuilder(args);

// Настройка Kestrel (использует переменную окружения ASPNETCORE_URLS или настройки из appsettings.json)
// В Docker контейнере используется ASPNETCORE_URLS=http://+:8000
builder.WebHost.ConfigureKestrel(options =>
{
    // В Production режиме проверяем наличие сертификата для HTTPS
    if (!builder.Environment.IsDevelopment())
    {
        var certPath = builder.Configuration["Kestrel:Certificates:Default:Path"];
        var certPassword = builder.Configuration["Kestrel:Certificates:Default:Password"];
        
        // Если сертификат указан и существует - добавляем HTTPS на порт 8443
        if (!string.IsNullOrEmpty(certPath) && System.IO.File.Exists(certPath))
        {
            options.Listen(IPAddress.Any, 8443, listenOptions =>
            {
                listenOptions.UseHttps(new System.Security.Cryptography.X509Certificates.X509Certificate2(certPath, certPassword));
            });
        }
    }
});

// Настройка конфигурации
var configuration = builder.Configuration;
var jwtSettings = configuration.GetSection("Jwt");

// Добавляем Controllers (вместо Minimal APIs для совместимости с FastAPI стилем)
// Настраиваем поддержку form-urlencoded для OAuth2 совместимости
builder.Services.AddControllers(options =>
{
    // Разрешаем обработку form-urlencoded
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
})
.AddJsonOptions(options =>
{
    // Настройки JSON сериализации
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.WriteIndented = builder.Environment.IsDevelopment();
})
.ConfigureApiBehaviorOptions(options =>
{
    // Отключаем автоматическую валидацию модели для form-urlencoded endpoints
    // (валидация будет выполняться вручную в контроллерах)
    options.SuppressModelStateInvalidFilter = false;
});

// CORS настройка
var corsOrigins = configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowCors", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
        
        // В development режиме разрешаем любые localhost порты
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin => 
                origin.Contains("localhost") || origin.Contains("127.0.0.1"));
        }
    });
});

// JWT Authentication
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey не настроен");
var key = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Authorization with policies
builder.Services.AddAuthorization(options =>
{
    // Политика для администраторов
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
        {
            // Проверяем роль через claims или через базу данных
            // В данном случае проверка выполняется в AdminService.IsAdminAsync
            return true; // Базовая проверка - пользователь авторизован
        });
    });

    // Политика для партнеров
    options.AddPolicy("PartnerOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
        {
            // Проверка выполняется в PartnerDashboardService.IsPartnerOrEmployeeAsync
            return true; // Базовая проверка - пользователь авторизован
        });
    });

    // Политика для суперадминов
    options.AddPolicy("SuperAdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("superadmin");
    });
});

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Исправляем проблемы с именами схем (избегаем конфликтов имен типов)
    options.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
    
    // Игнорируем устаревшие действия и свойства
    options.IgnoreObsoleteActions();
    options.IgnoreObsoleteProperties();
    
    // Обрабатываем конфликтующие действия (берем первое)
    options.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
    
    // Временно исключаем endpoints с IFormFile из Swagger документации
    // Для Swashbuckle 6+ требуется специальный OperationFilter с Microsoft.OpenApi.Models
    // Endpoints будут работать нормально, но не будут отображаться в Swagger UI
    options.DocInclusionPredicate((docName, apiDesc) =>
    {
        // Исключаем UploadController endpoints до настройки правильного фильтра
        if (apiDesc.RelativePath?.Contains("/upload") == true)
        {
            return false;
        }
        return true;
    });
    
    // Включаем XML комментарии (если есть)
    try
    {
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
        {
            options.IncludeXmlComments(xmlPath);
        }
    }
    catch
    {
        // Игнорируем ошибки при поиске XML файлов
    }
});

// EF Core - PostgreSQL
var connectionString = configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' не найден");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(30); // Таймаут запроса 30 секунд
        npgsqlOptions.MigrationsAssembly("YessBackend.Infrastructure");
    });
    
    // Логирование SQL только в Development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Redis
var redisConnectionString = configuration["Redis:ConnectionString"] ?? "localhost:6379";
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
    options.InstanceName = "YessBackend:";
});

// HttpClient для внешних API (OSRM, GraphHopper и т.д.)
builder.Services.AddHttpClient();

// Регистрация сервисов
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(configuration);

// Регистрация сервисов приложения
builder.Services.AddScoped<IAuthService, YessBackend.Infrastructure.Services.AuthService>();
builder.Services.AddScoped<IWalletService, YessBackend.Infrastructure.Services.WalletService>();
builder.Services.AddScoped<IPartnerService, YessBackend.Infrastructure.Services.PartnerService>();
builder.Services.AddScoped<IOrderService, YessBackend.Infrastructure.Services.OrderService>();
builder.Services.AddScoped<IHealthService, YessBackend.Infrastructure.Services.HealthService>();
builder.Services.AddScoped<IRouteService, YessBackend.Infrastructure.Services.RouteService>();
builder.Services.AddScoped<ILocationService, YessBackend.Infrastructure.Services.LocationService>();
builder.Services.AddScoped<IStorageService, YessBackend.Infrastructure.Services.StorageService>();
builder.Services.AddScoped<IQRService, YessBackend.Infrastructure.Services.QRService>();
builder.Services.AddScoped<IStoryService, YessBackend.Infrastructure.Services.StoryService>();
builder.Services.AddScoped<IPartnerProductService, YessBackend.Infrastructure.Services.PartnerProductService>();
builder.Services.AddScoped<IOrderPaymentService, YessBackend.Infrastructure.Services.OrderPaymentService>();
builder.Services.AddScoped<IWebhookService, YessBackend.Infrastructure.Services.WebhookService>();
builder.Services.AddScoped<IPaymentProviderService, YessBackend.Infrastructure.Services.PaymentProviderService>();
builder.Services.AddScoped<INotificationService, YessBackend.Infrastructure.Services.NotificationService>();
builder.Services.AddScoped<IAchievementService, YessBackend.Infrastructure.Services.AchievementService>();
builder.Services.AddScoped<IPromotionService, YessBackend.Infrastructure.Services.PromotionService>();
builder.Services.AddScoped<IBankService, YessBackend.Infrastructure.Services.BankService>();

// Регистрация сервисов для панелей (Admin и Partner Dashboard)
builder.Services.AddScoped<IAdminService, YessBackend.Infrastructure.Services.AdminService>();
builder.Services.AddScoped<IPartnerDashboardService, YessBackend.Infrastructure.Services.PartnerDashboardService>();

var app = builder.Build();

// Configure the HTTP request pipeline
// Swagger ДОЛЖЕН быть ПЕРЕД глобальным обработчиком исключений,
// чтобы видеть реальные ошибки при генерации документации

// Swagger доступен в Development или если явно включен через переменную окружения
var enableSwagger = app.Environment.IsDevelopment() || 
                    configuration.GetValue<bool>("EnableSwagger", false);

if (enableSwagger)
{
    // Swagger middleware ПЕРЕД обработчиком исключений
    // Добавляем обработку ошибок для Swagger
    app.UseSwagger(c =>
    {
        c.RouteTemplate = "swagger/{documentName}/swagger.json";
    });
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "YESS API v1");
        c.RoutePrefix = "docs"; // /docs для совместимости с FastAPI
        c.DisplayRequestDuration();
    });
}
else
{
    // Production: HTTPS redirect и HSTS только если HTTPS настроен
    var certPath = configuration["Kestrel:Certificates:Default:Path"];
    if (!string.IsNullOrEmpty(certPath) && System.IO.File.Exists(certPath))
    {
        app.UseHttpsRedirection();
        app.UseHsts();
    }
}

// Глобальный обработчик исключений (после Swagger, чтобы не перехватывать ошибки генерации документации)
app.UseGlobalExceptionHandler();

// Rate Limiting
app.UseRateLimiting(configuration);

// CORS должен быть перед UseAuthentication
app.UseCors("AllowCors");

app.UseAuthentication();
app.UseAuthorization();

// Root endpoint
app.MapGet("/", () => new
{
    status = "ok",
    service = "yess-backend",
    api = "/api/v1",
    docs = "/docs"
});

// Health check endpoint (базовый, без проверки БД)
// Основной health check находится в HealthController: /api/v1/health
app.MapGet("/health", () => new
{
    status = "healthy",
    service = "yess-backend",
    version = "1.0.0",
    timestamp = DateTime.UtcNow
});

// /api/v1/health определен в HealthController - удаляем дубликат Minimal API

// Health check для базы данных
app.MapGet("/health/db", async (ApplicationDbContext db) =>
{
    try
    {
        // Проверяем подключение к БД
        var canConnect = await db.Database.CanConnectAsync();
        if (canConnect)
        {
            return Results.Ok(new
            {
                status = "healthy",
                database = "connected",
                timestamp = DateTime.UtcNow
            });
        }
        else
        {
            return Results.StatusCode(503);
        }
    }
    catch
    {
        return Results.StatusCode(503);
    }
});

// Автоматическое применение миграций при старте приложения
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();
        
        // Проверяем подключение к БД
        if (await dbContext.Database.CanConnectAsync())
        {
            // Проверяем, есть ли ожидающие миграции
            var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                logger.LogInformation("Применение {Count} ожидающих миграций...", pendingMigrations.Count());
                foreach (var migration in pendingMigrations)
                {
                    logger.LogInformation("  - {Migration}", migration);
                }
                
                // Применяем все ожидающие миграции
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("Миграции успешно применены.");
            }
            else
            {
                logger.LogInformation("База данных актуальна, ожидающих миграций нет.");
            }
        }
        else
        {
            logger.LogWarning("Не удалось подключиться к базе данных. Миграции не применены.");
        }

        // Seed базовых ролей (только если БД доступна)
        if (await dbContext.Database.CanConnectAsync())
        {
            try
            {
                var rolesData = new[]
                {
                    new { Code = "user", Name = "user", Title = "Пользователь", Description = "Обычный пользователь" },
                    new { Code = "admin", Name = "admin", Title = "Администратор", Description = "Администратор системы" },
                    new { Code = "superadmin", Name = "superadmin", Title = "Супер-администратор", Description = "Супер-администратор с полным доступом" },
                    new { Code = "partner", Name = "partner", Title = "Партнер", Description = "Партнер (владелец бизнеса)" },
                    new { Code = "moderator", Name = "moderator", Title = "Модератор", Description = "Модератор контента" }
                };

                foreach (var roleData in rolesData)
                {
                    var existingRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == roleData.Name || r.Code == roleData.Code);
                    if (existingRole == null)
                    {
                        dbContext.Roles.Add(new Role 
                        { 
                            Code = roleData.Code,
                            Name = roleData.Name,
                            Title = roleData.Title,
                            Description = roleData.Description
                        });
                        logger.LogInformation("Создана роль: {Role}", roleData.Name);
                    }
                }
                await dbContext.SaveChangesAsync();
            }
            catch (Exception roleEx)
            {
                logger.LogError(roleEx, "Ошибка при создании ролей.");
            }
        }

        // Seed тестового пользователя и администратора (только если БД доступна)
        if (await dbContext.Database.CanConnectAsync())
        {
            try
            {
                var authService = services.GetRequiredService<IAuthService>();
            
            // Тестовый пользователь
            const string testPhone = "+996504876087";
            const string testPassword = "123456";

            var existingUser = await authService.GetUserByPhoneAsync(testPhone);
            if (existingUser == null)
            {
                var user = new User
                {
                    Phone = testPhone,
                    Email = "testuser@example.com",
                    FirstName = "Test",
                    LastName = "User",
                    PasswordHash = authService.HashPassword(testPassword),
                    PhoneVerified = true,
                    EmailVerified = false,
                    IsActive = true,
                    IsBlocked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync();

                var wallet = new Wallet
                {
                    UserId = user.Id,
                    Balance = 0.0m,
                    YescoinBalance = 0.0m,
                    TotalEarned = 0.0m,
                    TotalSpent = 0.0m,
                    LastUpdated = DateTime.UtcNow
                };

                dbContext.Wallets.Add(wallet);
                await dbContext.SaveChangesAsync();

                logger.LogInformation("Создан тестовый пользователь {Phone} с паролем {Password}", testPhone, testPassword);
            }
            else
            {
                logger.LogInformation("Тестовый пользователь {Phone} уже существует (Id={Id})", existingUser.Phone, existingUser.Id);
            }

            // Администратор и партнер системы
            const string adminPhone = "+996551697296";
            const string adminEmail = "aman4ikaitbekov@icloud.com";
            const string adminPassword = "Chillgu1";

            // Проверяем существование пользователя по телефону или email
            var existingAdmin = await dbContext.Users
                .FirstOrDefaultAsync(u => u.Phone == adminPhone || u.Email == adminEmail);

            User adminUser;
            bool isNewUser = false;

            if (existingAdmin == null)
            {
                // Создаем нового пользователя
                adminUser = new User
                {
                    Phone = adminPhone,
                    Email = adminEmail,
                    FirstName = "Aman",
                    LastName = "Aitbekov",
                    PasswordHash = authService.HashPassword(adminPassword),
                    PhoneVerified = true,
                    EmailVerified = true,
                    IsActive = true,
                    IsBlocked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                dbContext.Users.Add(adminUser);
                await dbContext.SaveChangesAsync();
                isNewUser = true;
            }
            else
            {
                // Обновляем существующего пользователя
                adminUser = existingAdmin;
                adminUser.Phone = adminPhone;
                adminUser.Email = adminEmail;
                adminUser.PasswordHash = authService.HashPassword(adminPassword);
                adminUser.PhoneVerified = true;
                adminUser.EmailVerified = true;
                adminUser.IsActive = true;
                adminUser.IsBlocked = false;
                adminUser.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
                logger.LogInformation("Обновлен пользователь {Phone} (Id={Id})", adminPhone, adminUser.Id);
            }

            // Создаем или обновляем кошелек
            var adminWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == adminUser.Id);
            if (adminWallet == null)
            {
                adminWallet = new Wallet
                {
                    UserId = adminUser.Id,
                    Balance = 0.0m,
                    YescoinBalance = 0.0m,
                    TotalEarned = 0.0m,
                    TotalSpent = 0.0m,
                    LastUpdated = DateTime.UtcNow
                };
                dbContext.Wallets.Add(adminWallet);
                await dbContext.SaveChangesAsync();
            }

            // Назначаем роли admin, superadmin и partner
            var adminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "admin");
            var superadminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "superadmin");
            var partnerRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "partner");
            
            // Проверяем и добавляем роли, если их еще нет
            if (adminRole != null)
            {
                var existingAdminRole = await dbContext.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == adminRole.Id);
                if (existingAdminRole == null)
                    dbContext.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = adminRole.Id });
            }
            
            if (superadminRole != null)
            {
                var existingSuperadminRole = await dbContext.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == superadminRole.Id);
                if (existingSuperadminRole == null)
                    dbContext.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = superadminRole.Id });
            }
            
            if (partnerRole != null)
            {
                var existingPartnerRole = await dbContext.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == partnerRole.Id);
                if (existingPartnerRole == null)
                    dbContext.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = partnerRole.Id });
            }

            await dbContext.SaveChangesAsync();

            // Создаем или обновляем партнера для доступа к Partner Panel
            var existingPartner = await dbContext.Partners
                .FirstOrDefaultAsync(p => p.OwnerId == adminUser.Id);

            if (existingPartner == null)
            {
                // Получаем первый город (или создаем Бишкек, если нет городов)
                var city = await dbContext.Cities.FirstOrDefaultAsync();
                if (city == null)
                {
                    city = new City
                    {
                        Name = "Бишкек",
                        NameRu = "Бишкек",
                        NameKg = "Бишкек",
                        NameEn = "Bishkek",
                        IsCapital = true,
                        Latitude = 42.8746m,
                        Longitude = 74.5698m
                    };
                    dbContext.Cities.Add(city);
                    await dbContext.SaveChangesAsync();
                }

                var partner = new Partner
                {
                    Name = $"{adminUser.FirstName} {adminUser.LastName}".Trim(),
                    Email = adminEmail,
                    Phone = adminPhone,
                    OwnerId = adminUser.Id,
                    CityId = city.Id,
                    Category = "General",
                    MaxDiscountPercent = 20.0m,
                    CashbackRate = 5.0m,
                    DefaultCashbackRate = 5.0m,
                    IsActive = true,
                    IsVerified = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                dbContext.Partners.Add(partner);
                await dbContext.SaveChangesAsync();

                logger.LogInformation("Создан партнер для пользователя {Phone} (PartnerId={PartnerId})", adminPhone, partner.Id);
            }
            else
            {
                // Обновляем существующего партнера
                existingPartner.Email = adminEmail;
                existingPartner.Phone = adminPhone;
                existingPartner.IsActive = true;
                existingPartner.IsVerified = true;
                existingPartner.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
                logger.LogInformation("Обновлен партнер для пользователя {Phone} (PartnerId={PartnerId})", adminPhone, existingPartner.Id);
            }

            if (isNewUser)
            {
                logger.LogInformation("Создан администратор и партнер {Phone} / {Email} с паролем {Password}", adminPhone, adminEmail, adminPassword);
            }
            else
            {
                logger.LogInformation("Обновлен администратор и партнер {Phone} / {Email} с новым паролем", adminPhone, adminEmail);
            }
            }
            catch (Exception seedEx)
            {
                logger.LogError(seedEx, "Ошибка при создании тестовых пользователей.");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ошибка при инициализации базы данных: {Message}", ex.Message);
        // Не выбрасываем исключение, чтобы приложение могло запуститься даже без БД
        // Это полезно для разработки, когда БД может быть недоступна
    }
}

// Map Controllers
app.MapControllers();

app.Run();