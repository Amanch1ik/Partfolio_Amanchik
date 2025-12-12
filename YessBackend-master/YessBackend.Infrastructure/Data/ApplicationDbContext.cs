using Microsoft.EntityFrameworkCore;
using YessBackend.Domain.Entities;
using YessBackend.Infrastructure.Data.Configurations;

namespace YessBackend.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    
    // Users and Authentication
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Wallet> Wallets { get; set; }
    
    // Partners
    public DbSet<Partner> Partners { get; set; }
    public DbSet<PartnerLocation> PartnerLocations { get; set; }
    public DbSet<PartnerEmployee> PartnerEmployees { get; set; }
    public DbSet<PartnerProduct> PartnerProducts { get; set; }
    
    // Orders and Transactions
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<PaymentProviderTransaction> PaymentProviderTransactions { get; set; }
    
    // Geography
    public DbSet<City> Cities { get; set; }
    
    // Promotions
    public DbSet<Promotion> Promotions { get; set; }
    public DbSet<PromoCode> PromoCodes { get; set; }
    public DbSet<UserPromoCode> UserPromoCodes { get; set; }
    public DbSet<PromotionUsage> PromotionUsages { get; set; }
    
    // Achievements
    public DbSet<Achievement> Achievements { get; set; }
    public DbSet<UserAchievement> UserAchievements { get; set; }
    public DbSet<UserLevel> UserLevels { get; set; }
    public DbSet<LevelReward> LevelRewards { get; set; }
    public DbSet<UserLevelReward> UserLevelRewards { get; set; }
    public DbSet<AchievementProgress> AchievementProgresses { get; set; }
    
    // Stories
    public DbSet<Story> Stories { get; set; }
    public DbSet<StoryView> StoryViews { get; set; }
    public DbSet<StoryClick> StoryClicks { get; set; }
    
    // Notifications
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationSettings> NotificationSettings { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<NotificationLog> NotificationLogs { get; set; }
    
    // Payments
    public DbSet<Refund> Refunds { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }
    public DbSet<PaymentAnalytics> PaymentAnalytics { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Применяем конфигурации сущностей
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new WalletConfiguration());
        modelBuilder.ApplyConfiguration(new PartnerConfiguration());
        modelBuilder.ApplyConfiguration(new PartnerProductConfiguration());
        modelBuilder.ApplyConfiguration(new TransactionConfiguration());
        modelBuilder.ApplyConfiguration(new OrderConfiguration());
        
        // Конфигурация для JSON полей (если используется PostgreSQL JSONB)
        // EF Core 8 поддерживает JSON нативно для PostgreSQL
    }
}
