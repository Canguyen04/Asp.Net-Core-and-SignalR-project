using System.ComponentModel.DataAnnotations;

namespace Logistics.Api.Domain;

public class User
{
    public int Id { get; set; }
    [MaxLength(120)] public string Name { get; set; } = "";
    [MaxLength(200)] public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    [MaxLength(20)] public string Role { get; set; } = "customer";
    [MaxLength(30)] public string Phone { get; set; } = "";
    [MaxLength(30)] public string LicensePlate { get; set; } = "";
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;
    [MaxLength(400)] public string BanReason { get; set; } = "";
    public bool Online { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
public class DeliveryOrder
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public User Customer { get; set; } = null!;
    public int? DriverId { get; set; }
    public User? Driver { get; set; }
    [MaxLength(25)] public string Status { get; set; } = "pending";
    [MaxLength(25)] public string ServiceType { get; set; } = "express";
    [MaxLength(500)] public string PickupAddress { get; set; } = "";
    [MaxLength(500)] public string DropoffAddress { get; set; } = "";
    public double? PickupLat { get; set; }
    public double? PickupLng { get; set; }
    public double? DropoffLat { get; set; }
    public double? DropoffLng { get; set; }
    public double DistanceKm { get; set; }
    [MaxLength(120)] public string SenderName { get; set; } = "";
    [MaxLength(30)] public string SenderPhone { get; set; } = "";
    [MaxLength(120)] public string ReceiverName { get; set; } = "";
    [MaxLength(30)] public string ReceiverPhone { get; set; } = "";
    [MaxLength(1000)] public string PackageDetails { get; set; } = "";
    [MaxLength(20)] public string PaymentMethod { get; set; } = "cash";
    public bool IsBulky { get; set; }
    public bool IsDoorDelivery { get; set; }
    public decimal TipAmount { get; set; }
    public decimal CodAmount { get; set; }
    public decimal BasePrice { get; set; }
    public decimal TotalPrice { get; set; }
    [MaxLength(32)] public string? PromotionCode { get; set; }
    public decimal DiscountAmount { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
    [MaxLength(250)] public string? ProofPhotoPath { get; set; }
    public bool PaidOut { get; set; }
    public List<OrderStatusHistory> History { get; set; } = [];
}
public class OrderStatusHistory
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ActorId { get; set; }
    [MaxLength(25)] public string Status { get; set; } = "";
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
}
public class OrderMessage
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int SenderId { get; set; }
    [MaxLength(2000)] public string Content { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
public class WalletTransaction
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? OrderId { get; set; }
    [MaxLength(30)] public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    [MaxLength(300)] public string Description { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
public class SupportMessage
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(20)] public string SenderType { get; set; } = "user";
    [MaxLength(2000)] public string Content { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
public class Review
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int CustomerId { get; set; }
    public int DriverId { get; set; }
    public int Stars { get; set; }
    [MaxLength(1000)] public string Feedback { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
