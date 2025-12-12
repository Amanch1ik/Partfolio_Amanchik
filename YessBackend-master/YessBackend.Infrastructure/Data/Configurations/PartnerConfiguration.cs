using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using YessBackend.Domain.Entities;

namespace YessBackend.Infrastructure.Data.Configurations;

/// <summary>
/// Конфигурация для Partner entity
/// Соответствует индексам и ограничениям из Python модели
/// </summary>
public class PartnerConfiguration : IEntityTypeConfiguration<Partner>
{
    public void Configure(EntityTypeBuilder<Partner> builder)
    {
        builder.ToTable("partners");

        // Индексы
        builder.HasIndex(p => p.Category);
        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => new { p.CityId, p.Latitude, p.Longitude }).HasDatabaseName("idx_partner_location");
        builder.HasIndex(p => new { p.IsActive, p.IsVerified, p.Category }).HasDatabaseName("idx_partner_status");
        builder.HasIndex(p => new { p.CashbackRate, p.IsActive }).HasDatabaseName("idx_partner_cashback");

        // Check constraints
        builder.HasCheckConstraint("check_discount_range", "max_discount_percent >= 0 AND max_discount_percent <= 100");
        builder.HasCheckConstraint("check_cashback_range", "cashback_rate >= 0 AND cashback_rate <= 100");

        // Relationships
        builder.HasOne(p => p.City)
            .WithMany(c => c.Partners)
            .HasForeignKey(p => p.CityId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
