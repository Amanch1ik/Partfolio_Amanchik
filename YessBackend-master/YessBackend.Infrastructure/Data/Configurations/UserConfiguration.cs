using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using YessBackend.Domain.Entities;

namespace YessBackend.Infrastructure.Data.Configurations;

/// <summary>
/// Конфигурация для User entity
/// Соответствует индексам и ограничениям из Python модели
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        // Храним DeviceTokens как jsonb строку (по умолчанию "[]")
        builder.Property(u => u.DeviceTokens)
            .HasColumnType("jsonb")
            .HasDefaultValue("[]");

        // Индексы
        builder.HasIndex(u => u.Phone).IsUnique();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.ReferralCode).IsUnique();
        builder.HasIndex(u => new { u.CityId, u.Latitude, u.Longitude }).HasDatabaseName("idx_user_location");
        builder.HasIndex(u => new { u.IsActive, u.LastLoginAt }).HasDatabaseName("idx_user_activity");
        builder.HasIndex(u => new { u.ReferralCode, u.ReferredBy }).HasDatabaseName("idx_user_referral");
        builder.HasIndex(u => new { u.PhoneVerified, u.EmailVerified }).HasDatabaseName("idx_user_verification");

        // Relationships
        builder.HasOne(u => u.City)
            .WithMany(c => c.Users)
            .HasForeignKey(u => u.CityId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(u => u.Wallet)
            .WithOne(w => w.User)
            .HasForeignKey<Wallet>(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
