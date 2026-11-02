using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Logistics.Api.Domain;
using Microsoft.IdentityModel.Tokens;
namespace Logistics.Api.Services;
public static class LogisticsServices
{
    public static int UserId(ClaimsPrincipal user) => int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    public static string Role(ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role) ?? "";
    public static object UserView(User u) => new {id=u.Id,user_id=u.Id,name=u.Name,email=u.Email,role=u.Role,phone=u.Phone,license_plate=u.LicensePlate,balance=u.Balance,is_active=u.IsActive,ban_reason=u.BanReason,online=u.Online};
    public static object OrderView(DeliveryOrder o) => new {
       id=o.Id,customer_id=o.CustomerId,driver_id=o.DriverId,customer=o.Customer?.Name,driver=o.Driver==null?null:new {name=o.Driver.Name,phone=o.Driver.Phone,licensePlate=o.Driver.LicensePlate},
       pickup=o.PickupAddress,dropoff=o.DropoffAddress,pickupAddress=o.PickupAddress,dropoffAddress=o.DropoffAddress,
       status=o.Status,serviceType=o.ServiceType,serviceName=o.ServiceType switch {"truck"=>"Xe tải 1.5 tấn","container"=>"Xe container",_=>"Xe máy giao nhanh"},
       senderName=o.SenderName,senderPhone=o.SenderPhone,receiverName=o.ReceiverName,receiverPhone=o.ReceiverPhone,packageDetails=o.PackageDetails,
       distance=o.DistanceKm,basePrice=o.BasePrice,extraFee=o.TotalPrice-o.BasePrice-o.TipAmount+o.DiscountAmount,totalPrice=o.TotalPrice,price=o.TotalPrice,driverEarning=Math.Round(o.TotalPrice*0.8m,0),
       paymentMethod=o.PaymentMethod,createdAt=o.CreatedAtUtc,updatedAt=o.UpdatedAtUtc,completedAt=o.CompletedAtUtc,proofPhotoPath=o.ProofPhotoPath
    };
    public static double Haversine(double lat1,double lng1,double lat2,double lng2)
    { double rad=Math.PI/180, dLat=(lat2-lat1)*rad,dLon=(lng2-lng1)*rad;
      double a=Math.Pow(Math.Sin(dLat/2),2)+Math.Cos(lat1*rad)*Math.Cos(lat2*rad)*Math.Pow(Math.Sin(dLon/2),2);
      return 6371*2*Math.Atan2(Math.Sqrt(a),Math.Sqrt(1-a)); }
    public static (decimal basePrice,decimal totalPrice,double distanceKm) Quote(CreateOrderRequest r)
    {
      // Giá backend sử dụng khoảng cách GPS ước lượng (đường bay x 1.3), không tin giá frontend gửi lên.
      double d=Haversine(r.PickupLat,r.PickupLng,r.DropoffLat,r.DropoffLng)*1.3;
      d=Math.Max(0.5,Math.Round(d,1));
      decimal price=r.ServiceType switch {
        "container" => 2600000m+Math.Max(0,(decimal)Math.Ceiling(d-20))*33000m,
        "truck" => 150000m+Math.Max(0,(decimal)Math.Ceiling(d-5))*15000m,
        _ => d<=3?16000m:d<=5?25000m:25000m+(decimal)Math.Ceiling(d-5)*6500m
      };
      var extra=(r.IsBulky && r.ServiceType!="container"?20000m:0)+(r.IsDoorDelivery?10000m:0);
      var tip=Math.Max(0,r.TipAmount);
      var discount=(r.PromotionCode?.Trim().ToUpperInvariant() is "SGU" or "ITVINA")?15000m:0m;
      return (price,Math.Max(0,price+extra+tip-discount),d);
    }
    public static string Token(User u,IConfiguration cfg)
    {
      var secret=cfg["JWT_SECRET"] ?? throw new InvalidOperationException("Thiếu JWT_SECRET. Hãy cấu hình biến môi trường JWT_SECRET (ít nhất 32 ký tự).");
      if (Encoding.UTF8.GetByteCount(secret)<32) throw new InvalidOperationException("JWT_SECRET phải đủ 32 bytes.");
      var key=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
      var cred=new SigningCredentials(key,SecurityAlgorithms.HmacSha256);
      var jwt=new JwtSecurityToken(issuer:cfg["Jwt:Issuer"],audience:cfg["Jwt:Audience"],
        claims:[new Claim(ClaimTypes.NameIdentifier,u.Id.ToString()),new Claim(ClaimTypes.Role,u.Role),new Claim(ClaimTypes.Name,u.Name)],
        expires:DateTime.UtcNow.AddHours(8),signingCredentials:cred);
      return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
public record LoginRequest(string Email,string Password);
public record RegisterRequest(string Name,string Email,string Password,string Role,string Phone,string? LicensePlate);
public record CreateOrderRequest(string PickupAddress,string DropoffAddress,double PickupLat,double PickupLng,double DropoffLat,double DropoffLng,
    string ServiceType,string SenderName,string SenderPhone,string ReceiverName,string ReceiverPhone,string PackageDetails,
    string PaymentMethod,bool IsBulky,bool IsDoorDelivery,decimal TipAmount,decimal CodAmount,string? PromotionCode);
public record StatusRequest(string Status);
public record MessageRequest(string Content);
public record AmountRequest(decimal Amount);
public record ProfileRequest(string Name,string Phone,string? LicensePlate);
public record LocationRequest(double Latitude,double Longitude,bool Online);
public record ReviewRequest(int Stars,string Feedback);
public record SupportRequest(string Content);
public record DriverAccountRequest(bool IsActive,string? Reason);
