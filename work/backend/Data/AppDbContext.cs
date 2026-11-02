using Logistics.Api.Domain;
using Microsoft.EntityFrameworkCore;
namespace Logistics.Api.Data;
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<DeliveryOrder> Orders => Set<DeliveryOrder>();
    public DbSet<OrderStatusHistory> StatusHistory => Set<OrderStatusHistory>();
    public DbSet<OrderMessage> OrderMessages => Set<OrderMessage>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();
    public DbSet<Review> Reviews => Set<Review>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<User>().HasIndex(x=>x.Email).IsUnique();
        m.Entity<DeliveryOrder>().HasIndex(x=>new {x.Status,x.CreatedAtUtc});
        m.Entity<DeliveryOrder>().HasOne(x=>x.Customer).WithMany().HasForeignKey(x=>x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        m.Entity<DeliveryOrder>().HasOne(x=>x.Driver).WithMany().HasForeignKey(x=>x.DriverId).OnDelete(DeleteBehavior.Restrict);
        m.Entity<OrderMessage>().HasIndex(x=>new {x.OrderId,x.CreatedAtUtc});
        m.Entity<WalletTransaction>().HasIndex(x=>new {x.UserId,x.CreatedAtUtc});
        m.Entity<Review>().HasIndex(x=>x.OrderId).IsUnique();
        m.Entity<User>().Property(x=>x.Balance).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<DeliveryOrder>().Property(x=>x.BasePrice).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<DeliveryOrder>().Property(x=>x.TotalPrice).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<DeliveryOrder>().Property(x=>x.DiscountAmount).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<DeliveryOrder>().Property(x=>x.TipAmount).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<DeliveryOrder>().Property(x=>x.CodAmount).HasConversion(v => (long)v, v => (decimal)v);
        m.Entity<WalletTransaction>().Property(x=>x.Amount).HasConversion(v => (long)v, v => (decimal)v);
    }
}
