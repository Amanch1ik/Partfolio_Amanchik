using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using YessBackend.Domain.Entities;

namespace YessBackend.Infrastructure.Data.Configurations;

/// <summary>
/// Конфигурация для Order entity
/// Соответствует ограничениям из Python модели
/// </summary>
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");

        // Индексы
        builder.HasIndex(o => o.UserId);
        builder.HasIndex(o => o.PartnerId);
        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.IdempotencyKey).IsUnique();
        builder.HasIndex(o => o.CreatedAt);

        // Check constraints
        builder.HasCheckConstraint("check_positive_total", "order_total >= 0");
        builder.HasCheckConstraint("check_positive_discount", "discount >= 0");
        builder.HasCheckConstraint("check_discount_not_exceeds_total", "discount <= order_total");
        builder.HasCheckConstraint("check_positive_cashback", "cashback_amount >= 0");
        builder.HasCheckConstraint("check_positive_final", "final_amount >= 0");

        // Relationships
        builder.HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Partner)
            .WithMany(p => p.Orders)
            .HasForeignKey(o => o.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.Items)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
