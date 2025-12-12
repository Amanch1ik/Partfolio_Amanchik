using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using YessBackend.Domain.Entities;

namespace YessBackend.Infrastructure.Data.Configurations;

/// <summary>
/// Конфигурация для PartnerProduct entity
/// </summary>
public class PartnerProductConfiguration : IEntityTypeConfiguration<PartnerProduct>
{
    public void Configure(EntityTypeBuilder<PartnerProduct> builder)
    {
        builder.ToTable("partner_products");

        // Images храним как jsonb строку (JSON массив строк)
        builder.Property(p => p.Images)
            .HasColumnType("jsonb");

        // Индексы
        builder.HasIndex(p => p.PartnerId);
        builder.HasIndex(p => p.IsAvailable);
        builder.HasIndex(p => new { p.PartnerId, p.IsAvailable }).HasDatabaseName("idx_partner_product_available");

        // Relationships
        builder.HasOne(p => p.Partner)
            .WithMany()
            .HasForeignKey("PartnerId")
            .OnDelete(DeleteBehavior.Cascade);
    }
}

