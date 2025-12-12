using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using YessBackend.Domain.Entities;

namespace YessBackend.Infrastructure.Data.Configurations;

/// <summary>
/// Конфигурация для Wallet entity
/// Соответствует ограничениям из Python модели
/// </summary>
public class WalletConfiguration : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> builder)
    {
        builder.ToTable("wallets");

        // Уникальный индекс для user_id
        builder.HasIndex(w => w.UserId).IsUnique();

        // Индекс
        builder.HasIndex(w => new { w.UserId, w.LastUpdated }).HasDatabaseName("idx_wallet_user_updated");

        // Check constraints (через HasCheckConstraint)
        builder.HasCheckConstraint("check_positive_balance", "balance >= 0");
        builder.HasCheckConstraint("check_positive_yescoin_balance", "yescoin_balance >= 0");
        builder.HasCheckConstraint("check_positive_total_earned", "total_earned >= 0");
        builder.HasCheckConstraint("check_positive_total_spent", "total_spent >= 0");

        // Relationships
        builder.HasOne(w => w.User)
            .WithOne(u => u.Wallet)
            .HasForeignKey<Wallet>(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
