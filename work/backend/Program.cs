using System.Security.Claims;
using System.Text;
using Logistics.Api.Data;
using Logistics.Api.Domain;
using Logistics.Api.Hubs;
using Logistics.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using static Logistics.Api.Services.LogisticsServices;

var builder=WebApplication.CreateBuilder(args);
var secret=builder.Configuration["JWT_SECRET"];
if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret)<32)
    throw new InvalidOperationException("Hãy đặt JWT_SECRET >=32 bytes (PowerShell: $env:JWT_SECRET='your-long-unique-secret...').");
builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://localhost:5000");
builder.Services.AddDbContext<AppDbContext>(o=>o.UseSqlite(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddSingleton<PasswordHasher<User>>();
builder.Services.AddSignalR();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>{
    o.TokenValidationParameters=new TokenValidationParameters {
        ValidateIssuer=true,ValidIssuer=builder.Configuration["Jwt:Issuer"],
        ValidateAudience=true,ValidAudience=builder.Configuration["Jwt:Audience"],
        ValidateIssuerSigningKey=true,IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ValidateLifetime=true,ClockSkew=TimeSpan.FromSeconds(30)
    };
    o.Events=new JwtBearerEvents {OnMessageReceived=ctx=>{
        if (ctx.Request.Path.StartsWithSegments("/hubs/logistics")){
            var token=ctx.Request.Query["access_token"];
            if (!string.IsNullOrWhiteSpace(token)) ctx.Token=token;
        }
        return Task.CompletedTask;
    }};
});
builder.Services.AddAuthorization();
builder.Services.AddCors(o=>o.AddPolicy("frontend",p=>p.WithOrigins("http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app=builder.Build();
app.UseCors("frontend");
app.UseAuthentication();
// A banned user cannot continue using an old still-valid JWT.
app.Use(async (context,next)=>{
  if(context.User.Identity?.IsAuthenticated==true){
    using var scope=context.RequestServices.CreateScope();
    var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if(!await db.Users.AnyAsync(u=>u.Id==UserId(context.User)&&u.IsActive)){
      context.Response.StatusCode=403;
      await context.Response.WriteAsJsonAsync(new{detail="Tài khoản đã bị vô hiệu hóa."});return;
    }
  }
  await next();
});
app.UseAuthorization();
if (app.Environment.IsDevelopment()) {app.UseSwagger();app.UseSwaggerUI();}
app.MapGet("/health",()=>Results.Ok(new{status="ok",technology="ASP.NET Core 8 + SignalR",utc=DateTime.UtcNow}));

// SQLite demo: tạo schema tại lần chạy đầu. Với production chuyển sang EF migrations.
using(var scope=app.Services.CreateScope()) {
  var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
  await db.Database.EnsureCreatedAsync();
  if(app.Environment.IsDevelopment()) {
    var hasher=scope.ServiceProvider.GetRequiredService<PasswordHasher<User>>();
    foreach(var (email,name,role) in new[]{("admin@demo.local","Quản trị Demo","admin"),("customer@demo.local","Khách hàng Demo","customer"),("driver@demo.local","Tài xế Demo","driver_express")}){
       if(await db.Users.AnyAsync(u=>u.Email==email))continue;
       var user=new User{Name=name,Email=email,Role=role,Phone="0900000000",LicensePlate=role.StartsWith("driver")?"59A-12345":"",Balance=role.StartsWith("driver")?500000m:0m};
       user.PasswordHash=hasher.HashPassword(user,"Demo@12345");db.Users.Add(user);
    }
    await db.SaveChangesAsync();
  }
}

// PUBLIC AUTH: role admin không được đăng ký từ giao diện.
app.MapPost("/api/auth/register",async(RegisterRequest req,AppDbContext db,PasswordHasher<User> hasher)=>{
  var role=req.Role?.Trim().ToLowerInvariant()??"customer";
  if(role!="customer" && role!="driver_express" && role!="driver_truck" && role!="driver_container")return Error("Vai trò không hợp lệ.");
  if(string.IsNullOrWhiteSpace(req.Name)||string.IsNullOrWhiteSpace(req.Email)||req.Password.Length<8)return Error("Tên, email và mật khẩu >=8 ký tự là bắt buộc.");
  if(role.StartsWith("driver")&&string.IsNullOrWhiteSpace(req.LicensePlate))return Error("Tài xế cần khai báo biển số.");
  var email=req.Email.Trim().ToLowerInvariant();
  if(await db.Users.AnyAsync(u=>u.Email==email))return Error("Email đã tồn tại.",409);
  var u=new User{Name=req.Name.Trim(),Email=email,Role=role,Phone=req.Phone?.Trim()??"",LicensePlate=req.LicensePlate?.Trim()??""};
  u.PasswordHash=hasher.HashPassword(u,req.Password);db.Users.Add(u);await db.SaveChangesAsync();
  return Results.Created($"/api/users/{u.Id}",new{message="Đăng ký thành công.",user_id=u.Id});
});
app.MapPost("/api/auth/login",async(LoginRequest req,AppDbContext db,PasswordHasher<User> hasher,IConfiguration config)=>{
  var email=req.Email?.Trim().ToLowerInvariant();
  var u=await db.Users.FirstOrDefaultAsync(x=>x.Email==email);
  if(u==null||hasher.VerifyHashedPassword(u,u.PasswordHash,req.Password)==PasswordVerificationResult.Failed)
    return Error("Email hoặc mật khẩu không chính xác.",401);
  if(!u.IsActive)return Error("Tài khoản đã bị khóa: "+u.BanReason,403);
  return Results.Ok(new{user_id=u.Id,name=u.Name,email=u.Email,phone=u.Phone,license_plate=u.LicensePlate,role=u.Role,balance=u.Balance,access_token=Token(u,config),token_type="bearer"});
});

var api=app.MapGroup("/api").RequireAuthorization();
api.MapGet("/users/me",async(ClaimsPrincipal p,AppDbContext db)=>{
  var u=await db.Users.FindAsync(UserId(p));return u==null?Results.NotFound():Results.Ok(UserView(u));
});
api.MapGet("/users/{id:int}",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  if(UserId(p)!=id&&Role(p)!="admin")return Results.Forbid();
  var u=await db.Users.FindAsync(id);return u==null?Results.NotFound():Results.Ok(UserView(u));
});
api.MapPut("/users/me",async(ProfileRequest req,ClaimsPrincipal p,AppDbContext db)=>{
  var u=await db.Users.FindAsync(UserId(p));if(u==null)return Results.NotFound();
  if(string.IsNullOrWhiteSpace(req.Name))return Error("Tên không được trống.");
  u.Name=req.Name.Trim();u.Phone=req.Phone?.Trim()??"";
  if(u.Role.StartsWith("driver"))u.LicensePlate=req.LicensePlate?.Trim()??u.LicensePlate;
  await db.SaveChangesAsync();return Results.Ok(UserView(u));
});
api.MapPut("/drivers/me/location",async(LocationRequest req,ClaimsPrincipal p,AppDbContext db)=>{
  if(!Role(p).StartsWith("driver"))return Results.Forbid();
  if(!ValidGps(req.Latitude,req.Longitude))return Error("Tọa độ không hợp lệ.");
  var u=await db.Users.FindAsync(UserId(p));if(u==null)return Results.NotFound();
  u.Latitude=req.Latitude;u.Longitude=req.Longitude;u.Online=req.Online;await db.SaveChangesAsync();
  return Results.Ok(new{online=u.Online,latitude=u.Latitude,longitude=u.Longitude});
});

api.MapGet("/orders",async(ClaimsPrincipal p,AppDbContext db)=>{
  var uid=UserId(p);var role=Role(p);
  IQueryable<DeliveryOrder> q=db.Orders.AsNoTracking().Include(o=>o.Customer).Include(o=>o.Driver);
  if(role=="customer")q=q.Where(o=>o.CustomerId==uid);
  else if(role.StartsWith("driver"))q=q.Where(o=>o.DriverId==uid);
  else if(role!="admin")return Results.Forbid();
  var orders=await q.OrderByDescending(o=>o.CreatedAtUtc).Take(250).ToListAsync();
  return Results.Ok(orders.Select(OrderView));
});
api.MapGet("/orders/available",async(ClaimsPrincipal p,AppDbContext db)=>{
  if(!Role(p).StartsWith("driver")&&Role(p)!="admin")return Results.Forbid();
  var role=Role(p);
  var list=await db.Orders.AsNoTracking().Include(o=>o.Customer).Where(o=>o.Status=="pending"&&o.DriverId==null&&
    (role=="admin"||o.ServiceType=="express"&&role=="driver_express"||o.ServiceType=="truck"&&role=="driver_truck"||o.ServiceType=="container"&&role=="driver_container"))
    .OrderByDescending(o=>o.CreatedAtUtc).Take(60).ToListAsync();
  var u=await db.Users.FindAsync(UserId(p));
  if(u?.Latitude is double lat&&u.Longitude is double lng)
    list=list.OrderBy(o=>o.PickupLat.HasValue&&o.PickupLng.HasValue?Haversine(lat,lng,o.PickupLat.Value,o.PickupLng.Value):double.MaxValue).ToList();
  return Results.Ok(list.Select(OrderView));
});
api.MapGet("/orders/{id:int}",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  var o=await db.Orders.AsNoTracking().Include(o=>o.Customer).Include(o=>o.Driver).FirstOrDefaultAsync(o=>o.Id==id);
  if(o==null)return Results.NotFound();if(!CanSee(p,o))return Results.Forbid();
  return Results.Ok(OrderView(o));
});
api.MapGet("/orders/{id:int}/history",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();if(!CanSee(p,o))return Results.Forbid();
  var history=await db.StatusHistory.Where(h=>h.OrderId==id).OrderBy(h=>h.ChangedAtUtc).ToListAsync();
  return Results.Ok(history.Select(h=>new{h.Id,h.Status,h.ActorId,h.ChangedAtUtc}));
});
api.MapPost("/orders",async(CreateOrderRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
  if(Role(p)!="customer")return Results.Forbid();
  if(!ValidGps(req.PickupLat,req.PickupLng)||!ValidGps(req.DropoffLat,req.DropoffLng))return Error("Vị trí GPS không hợp lệ.");
  if(string.IsNullOrWhiteSpace(req.PickupAddress)||string.IsNullOrWhiteSpace(req.DropoffAddress)||string.IsNullOrWhiteSpace(req.ReceiverName)||string.IsNullOrWhiteSpace(req.ReceiverPhone))return Error("Thiếu thông tin lấy/giao hàng hoặc người nhận.");
  if(req.ServiceType is not("express" or "truck" or "container") || req.PaymentMethod is not("cash" or "bank"))return Error("Loại dịch vụ hoặc thanh toán không hợp lệ.");
  if(req.TipAmount<0||req.CodAmount<0||req.CodAmount>100000000)return Error("Tiền tip hoặc COD không hợp lệ.");
  var (baseP,total,distance)=Quote(req);var discount=Math.Max(0,baseP+(req.IsBulky?20000:0)+(req.IsDoorDelivery?10000:0)+req.TipAmount-total);
  var o=new DeliveryOrder{CustomerId=UserId(p),PickupAddress=req.PickupAddress.Trim(),DropoffAddress=req.DropoffAddress.Trim(),
    PickupLat=req.PickupLat,PickupLng=req.PickupLng,DropoffLat=req.DropoffLat,DropoffLng=req.DropoffLng,DistanceKm=distance,
    ServiceType=req.ServiceType,SenderName=req.SenderName,SenderPhone=req.SenderPhone,ReceiverName=req.ReceiverName,ReceiverPhone=req.ReceiverPhone,
    PackageDetails=req.PackageDetails??"",PaymentMethod=req.PaymentMethod,IsBulky=req.IsBulky,IsDoorDelivery=req.IsDoorDelivery,
    TipAmount=req.TipAmount,CodAmount=req.CodAmount,BasePrice=baseP,TotalPrice=total,DiscountAmount=discount,PromotionCode=req.PromotionCode};
  db.Orders.Add(o);await db.SaveChangesAsync();db.StatusHistory.Add(new OrderStatusHistory{OrderId=o.Id,ActorId=UserId(p),Status="pending"});await db.SaveChangesAsync();
  o.Customer=await db.Users.FindAsync(o.CustomerId)??null!;
  var payload=OrderView(o);await hub.Clients.Group("role_admin").SendAsync("OrderCreated",payload);
  var driverRole=req.ServiceType switch {"truck"=>"driver_truck","container"=>"driver_container",_=>"driver_express"};
  await hub.Clients.Group($"role_{driverRole}").SendAsync("OrderCreated",payload);
  await hub.Clients.Group($"role_{driverRole}").SendAsync("RealtimeEvent",new{eventName="urgent_order_alert",order_id=o.Id});
  return Results.Created($"/api/orders/{o.Id}",payload);
});
api.MapPost("/orders/{id:int}/accept",async(int id,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
  var role=Role(p);if(!role.StartsWith("driver"))return Results.Forbid();
  var service=role switch {"driver_truck"=>"truck","driver_container"=>"container",_=>"express"};
  if(!await db.Users.AnyAsync(u=>u.Id==UserId(p)&&u.Online))return Error("Hãy bật ONLINE trước khi nhận đơn.",409);
  // Conditional UPDATE bảo đảm chỉ một tài xế nhận được đơn.
  var updated=await db.Orders.Where(o=>o.Id==id&&o.Status=="pending"&&o.DriverId==null&&o.ServiceType==service)
     .ExecuteUpdateAsync(s=>s.SetProperty(o=>o.DriverId,UserId(p)).SetProperty(o=>o.Status,"accepted").SetProperty(o=>o.UpdatedAtUtc,DateTime.UtcNow));
  if(updated==0)return Error("Đơn không còn khả dụng hoặc không đúng loại xe.",409);
  db.StatusHistory.Add(new OrderStatusHistory{OrderId=id,ActorId=UserId(p),Status="accepted"});await db.SaveChangesAsync();
  var o=await db.Orders.AsNoTracking().Include(o=>o.Customer).Include(o=>o.Driver).FirstAsync(o=>o.Id==id);
  var payload=OrderView(o);await BroadcastOrder(hub,o,payload);
  return Results.Ok(payload);
});
api.MapPatch("/orders/{id:int}/status",async(int id,StatusRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
  var uid=UserId(p);var role=Role(p);
  var o=await db.Orders.Include(o=>o.Customer).Include(o=>o.Driver).FirstOrDefaultAsync(o=>o.Id==id);if(o==null)return Results.NotFound();
  var next=req.Status.Trim().ToLowerInvariant();
  bool valid=OrderStateMachine.CanTransition(o.Status,next,role,uid,o.CustomerId,o.DriverId);
  if(!valid)return Error("Chuyển trạng thái không hợp lệ hoặc bạn không có quyền.",409);
  // Chỉ cho phép API cập nhật trạng thái, bảo toàn nghiệp vụ thanh toán trong một transaction.
  await using var tx=await db.Database.BeginTransactionAsync();
  var previous=o.Status;
  var affected=await db.Orders.Where(x=>x.Id==id&&x.Status==previous)
    .ExecuteUpdateAsync(set=>set.SetProperty(x=>x.Status,next).SetProperty(x=>x.UpdatedAtUtc,DateTime.UtcNow));
  if(affected==0){await tx.RollbackAsync();return Error("Đơn đã thay đổi, vui lòng tải lại.",409);}
  o.Status=next;o.UpdatedAtUtc=DateTime.UtcNow;
  db.StatusHistory.Add(new OrderStatusHistory{OrderId=o.Id,ActorId=uid,Status=next});
  if(next=="completed"&&!o.PaidOut&&o.DriverId.HasValue){
    // Mô phỏng sổ cái: cash -> trừ hoa hồng, bank -> cộng doanh thu ròng.
    var driver=await db.Users.FindAsync(o.DriverId.Value);
    if(driver!=null){
      var amount=o.PaymentMethod=="cash"?-Math.Round(o.TotalPrice*0.2m,0):Math.Round(o.TotalPrice*0.8m,0);
      driver.Balance+=amount;
      db.WalletTransactions.Add(new WalletTransaction{UserId=driver.Id,OrderId=o.Id,Amount=amount,Type=amount>=0?"income":"deduction",Description=$"Quyết toán đơn #{o.Id} ({o.PaymentMethod})"});
    }
    o.PaidOut=true;o.CompletedAtUtc=DateTime.UtcNow;
  }
  await db.SaveChangesAsync();await tx.CommitAsync();
  var payload=OrderView(o);await BroadcastOrder(hub,o,payload);
  if(next=="completed"&&o.DriverId.HasValue)await hub.Clients.Group($"user_{o.DriverId.Value}").SendAsync("RealtimeEvent",new{eventName="balance_changed"});
  return Results.Ok(payload);
});


// Ảnh xác nhận giao hàng (POD) nằm trong thư mục riêng và chỉ được tải qua API đã xác thực.
api.MapPost("/orders/{id:int}/pod",async(int id,IFormFile file,ClaimsPrincipal p,AppDbContext db,IHostEnvironment env)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();
  if(o.DriverId!=UserId(p)||o.Status is not("delivering" or "completed"))return Results.Forbid();
  if(file.Length<12||file.Length>5*1024*1024)return Error("Ảnh phải nhỏ hơn 5MB.");
  var kind=file.ContentType switch {"image/jpeg"=>".jpg","image/png"=>".png","image/webp"=>".webp",_=>""};
  if(kind=="")return Error("Chỉ cho phép JPEG, PNG hoặc WebP.");
  var buffer=new byte[12];
  await using(var input=file.OpenReadStream()){await input.ReadExactlyAsync(buffer);}
  bool valid=kind switch {
    ".jpg" => buffer[0]==0xFF && buffer[1]==0xD8 && buffer[2]==0xFF,
    ".png" => buffer[0]==137 && buffer[1]==80 && buffer[2]==78 && buffer[3]==71,
    _ => buffer[0]==0x52 && buffer[1]==0x49 && buffer[2]==0x46 && buffer[3]==0x46 && buffer[8]==0x57 && buffer[9]==0x45 && buffer[10]==0x42 && buffer[11]==0x50
  };
  if(!valid)return Error("Nội dung file không đúng định dạng ảnh.");
  var dir=Path.Combine(env.ContentRootPath,"uploads","pods");Directory.CreateDirectory(dir);
  var name=$"{Guid.NewGuid():N}{kind}";var full=Path.Combine(dir,name);
  await using(var output=File.Create(full)){await file.CopyToAsync(output);}
  var old=o.ProofPhotoPath;o.ProofPhotoPath=name;await db.SaveChangesAsync();
  if(old!=null) {var oldPath=Path.Combine(dir,Path.GetFileName(old));if(File.Exists(oldPath))File.Delete(oldPath);}
  return Results.Ok(new{message="Đã lưu ảnh POD",url=$"/api/orders/{id}/pod"});
}).DisableAntiforgery();
api.MapGet("/orders/{id:int}/pod",async(int id,ClaimsPrincipal p,AppDbContext db,IHostEnvironment env)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();if(!CanSee(p,o))return Results.Forbid();
  if(o.ProofPhotoPath==null)return Results.NotFound();
  var ext=Path.GetExtension(o.ProofPhotoPath);var mime=ext switch {".png"=>"image/png",".webp"=>"image/webp",_=>"image/jpeg"};
  var full=Path.Combine(env.ContentRootPath,"uploads","pods",Path.GetFileName(o.ProofPhotoPath));
  return File.Exists(full)?Results.File(full,mime):Results.NotFound();
});

api.MapGet("/orders/{id:int}/messages",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();if(!CanSee(p,o))return Results.Forbid();
  var items=await db.OrderMessages.Where(x=>x.OrderId==id).OrderBy(x=>x.CreatedAtUtc).ToListAsync();
  return Results.Ok(items.Select(m=>new {id=m.Id,sender_id=m.SenderId,sender=m.SenderId==o.CustomerId?"customer":"driver",text=m.Content,content=m.Content,created_at=m.CreatedAtUtc}));
});
api.MapPost("/orders/{id:int}/messages",async(int id,MessageRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();
  if(UserId(p)!=o.CustomerId&&UserId(p)!=o.DriverId)return Results.Forbid();
  if(string.IsNullOrWhiteSpace(req.Content)||req.Content.Length>2000)return Error("Tin nhắn phải từ 1 đến 2000 ký tự.");
  var m=new OrderMessage{OrderId=id,SenderId=UserId(p),Content=req.Content.Trim()};db.OrderMessages.Add(m);await db.SaveChangesAsync();
  var payload=new{id=m.Id,sender_id=m.SenderId,sender=UserId(p)==o.CustomerId?"customer":"driver",text=m.Content,content=m.Content,created_at=m.CreatedAtUtc};
  await hub.Clients.Group($"user_{o.CustomerId}").SendAsync("NewChatMessage",new{orderId=id,message=payload});
  if(o.DriverId.HasValue)await hub.Clients.Group($"user_{o.DriverId.Value}").SendAsync("NewChatMessage",new{orderId=id,message=payload});
  return Results.Ok(payload);
});
api.MapPost("/orders/{id:int}/reviews",async(int id,ReviewRequest req,ClaimsPrincipal p,AppDbContext db)=>{
  var o=await db.Orders.FindAsync(id);if(o==null)return Results.NotFound();
  if(o.CustomerId!=UserId(p)||o.Status!="completed"||o.DriverId==null)return Results.Forbid();
  if(req.Stars<1||req.Stars>5)return Error("Đánh giá từ 1 đến 5 sao.");
  if(await db.Reviews.AnyAsync(r=>r.OrderId==id))return Error("Đã đánh giá đơn này.",409);
  db.Reviews.Add(new Review{OrderId=id,CustomerId=UserId(p),DriverId=o.DriverId.Value,Stars=req.Stars,Feedback=req.Feedback??""});await db.SaveChangesAsync();
  return Results.Ok(new{message="Cảm ơn bạn đã đánh giá."});
});

api.MapGet("/users/{id:int}/transactions",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  if(id!=UserId(p)&&Role(p)!="admin")return Results.Forbid();
  var rows=await db.WalletTransactions.Where(t=>t.UserId==id).OrderByDescending(t=>t.CreatedAtUtc).Take(200).ToListAsync();
  return Results.Ok(rows.Select(t=>new{id=t.Id,type=t.Type,amount=t.Amount,title=t.Description,description=t.Description,timestamp=t.CreatedAtUtc,created_at=t.CreatedAtUtc,createdAt=t.CreatedAtUtc,order_id=t.OrderId}));
});
api.MapPost("/users/{id:int}/topup",async(int id,AmountRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub,IHostEnvironment env)=>{
  // NẠP TIỀN GIẢ LẬP CHỈ Ở DEVELOPMENT. Production cần xác nhận webhook từ cổng thanh toán.
  if(!env.IsDevelopment())return Error("Nạp tiền demo chỉ có ở môi trường Development.",403);
  if(id!=UserId(p)&&Role(p)!="admin")return Results.Forbid();
  if(req.Amount<=0||req.Amount>10000000||req.Amount!=decimal.Truncate(req.Amount))return Error("Số tiền nạp phải > 0 và <= 10 triệu.");
  var u=await db.Users.FindAsync(id);if(u==null)return Results.NotFound();
  u.Balance+=req.Amount;db.WalletTransactions.Add(new WalletTransaction{UserId=id,Amount=req.Amount,Type="topup",Description="Nạp ví mô phỏng - không phải tiền thật"});await db.SaveChangesAsync();
  await hub.Clients.Group($"user_{id}").SendAsync("RealtimeEvent",new{eventName="balance_changed"});return Results.Ok(UserView(u));
});
api.MapPost("/users/{id:int}/withdraw",async(int id,AmountRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub,IHostEnvironment env)=>{
  if(!env.IsDevelopment())return Error("Rút tiền demo chỉ có ở môi trường Development.",403);
  if(id!=UserId(p)&&Role(p)!="admin")return Results.Forbid();
  if(req.Amount<=0||req.Amount>10000000||req.Amount!=decimal.Truncate(req.Amount))return Error("Số tiền rút không hợp lệ.");
  var u=await db.Users.FindAsync(id);if(u==null)return Results.NotFound();if(u.Balance<req.Amount)return Error("Số dư không đủ.",409);
  u.Balance-=req.Amount;db.WalletTransactions.Add(new WalletTransaction{UserId=id,Amount=-req.Amount,Type="withdrawal",Description="Rút ví mô phỏng"});await db.SaveChangesAsync();
  await hub.Clients.Group($"user_{id}").SendAsync("RealtimeEvent",new{eventName="balance_changed"});return Results.Ok(UserView(u));
});

api.MapGet("/support/{id:int}/messages",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  if(id!=UserId(p)&&Role(p)!="admin")return Results.Forbid();
  var rows=await db.SupportMessages.Where(m=>m.UserId==id).OrderBy(m=>m.CreatedAtUtc).ToListAsync();
  return Results.Ok(rows.Select(m=>new{id=m.Id,user_id=m.UserId,sender_type=m.SenderType,content=m.Content,created_at=m.CreatedAtUtc}));
});
api.MapPost("/support/messages",async(SupportRequest req,ClaimsPrincipal p,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
  if(string.IsNullOrWhiteSpace(req.Content)||req.Content.Length>2000)return Error("Nội dung không hợp lệ.");
  var id=UserId(p);db.SupportMessages.Add(new SupportMessage{UserId=id,SenderType="user",Content=req.Content.Trim()});
  db.SupportMessages.Add(new SupportMessage{UserId=id,SenderType="bot",Content="Hệ thống đã ghi nhận tin nhắn. Quản trị viên sẽ phản hồi khi có thể."});
  await db.SaveChangesAsync();await hub.Clients.Group($"user_{id}").SendAsync("RealtimeEvent",new{eventName="new_support_msg"});
  await hub.Clients.Group("role_admin").SendAsync("RealtimeEvent",new{eventName="new_support_msg",user_id=id});
  return Results.Ok(new{message="Đã gửi yêu cầu hỗ trợ."});
});
api.MapGet("/admin/users",async(AppDbContext db)=>Results.Ok((await db.Users.OrderByDescending(x=>x.Id).Take(300).ToListAsync()).Select(UserView))).RequireAuthorization(p=>p.RequireRole("admin"));
api.MapGet("/admin/summary",async(AppDbContext db)=>{
  var users=await db.Users.CountAsync();var orders=await db.Orders.CountAsync();
  var completed=await db.Orders.Where(o=>o.Status=="completed").Select(o=>o.TotalPrice).ToListAsync();
  var revenue=completed.Sum();return Results.Ok(new{userCount=users,orderCount=orders,totalRevenue=revenue,platformProfit=Math.Round(revenue*0.2m,0)});
}).RequireAuthorization(p=>p.RequireRole("admin"));

api.MapPut("/admin/drivers/{id:int}/status",async(int id,DriverAccountRequest req,AppDbContext db,IHubContext<LogisticsHub> hub)=>{
   var u=await db.Users.FindAsync(id);
   if(u==null)return Results.NotFound();
   if(!u.Role.StartsWith("driver"))return Error("Chỉ được quản lý tài khoản tài xế.");
   if(!req.IsActive&&string.IsNullOrWhiteSpace(req.Reason))return Error("Phải có lý do khóa tài khoản.");
   u.IsActive=req.IsActive;u.BanReason=req.IsActive?"":req.Reason!.Trim();if(!req.IsActive)u.Online=false;
   await db.SaveChangesAsync();
   await hub.Clients.Group($"user_{id}").SendAsync("AccountStatusChanged",new{isActive=u.IsActive,reason=u.BanReason});
   return Results.Ok(UserView(u));
}).RequireAuthorization(policy=>policy.RequireRole("admin"));

api.MapGet("/orders/{id:int}/match-suggestions",async(int id,ClaimsPrincipal p,AppDbContext db)=>{
  if(!Role(p).StartsWith("driver")&&Role(p)!="admin")return Results.Forbid();
  var src=await db.Orders.AsNoTracking().FirstOrDefaultAsync(x=>x.Id==id);
  if(src==null)return Results.NotFound();
  if(src.PickupLat==null||src.PickupLng==null||src.DropoffLat==null||src.DropoffLng==null)return Results.Ok(Array.Empty<object>());
  var candidates=await db.Orders.AsNoTracking().Where(x=>x.Id!=id&&x.Status=="pending"&&x.ServiceType==src.ServiceType)
    .OrderByDescending(x=>x.CreatedAtUtc).Take(100).ToListAsync();
  var picks=candidates.Where(o=>o.PickupLat.HasValue&&o.PickupLng.HasValue&&o.DropoffLat.HasValue&&o.DropoffLng.HasValue)
    .Where(o=>Haversine(src.PickupLat.Value,src.PickupLng.Value,o.PickupLat!.Value,o.PickupLng!.Value)<=2
       &&Haversine(src.DropoffLat.Value,src.DropoffLng.Value,o.DropoffLat!.Value,o.DropoffLng!.Value)<=2)
    .Where(o=>{
      // Vectors approximate direction; only suggest, do NOT auto-combine.
      var ax=src.DropoffLng.Value-src.PickupLng.Value;var ay=src.DropoffLat.Value-src.PickupLat.Value;
      var bx=o.DropoffLng!.Value-o.PickupLng!.Value;var by=o.DropoffLat!.Value-o.PickupLat!.Value;
      var norm=Math.Sqrt((ax*ax+ay*ay)*(bx*bx+by*by));return norm>0.000001&&(ax*bx+ay*by)/norm>0.7;
    }).Take(5).Select(o=>new{id=o.Id,pickup=o.PickupAddress,dropoff=o.DropoffAddress,price=o.TotalPrice}).ToList();
  return Results.Ok(picks);
});

app.MapHub<LogisticsHub>("/hubs/logistics");
app.Run();

static IResult Error(string message,int status=400) => Results.Json(new{detail=message},statusCode:status);
static bool ValidGps(double lat,double lng) => double.IsFinite(lat)&&double.IsFinite(lng)&&lat is >= -90 and <= 90&&lng is >= -180 and <= 180;
static bool CanSee(ClaimsPrincipal p,DeliveryOrder o)=>Role(p)=="admin"||o.CustomerId==UserId(p)||o.DriverId==UserId(p);
static async Task BroadcastOrder(IHubContext<LogisticsHub> hub,DeliveryOrder o,object payload) {
    await hub.Clients.Group($"user_{o.CustomerId}").SendAsync("OrderUpdated",payload);
    if(o.DriverId.HasValue)await hub.Clients.Group($"user_{o.DriverId.Value}").SendAsync("OrderUpdated",payload);
    await hub.Clients.Group("role_admin").SendAsync("OrderUpdated",payload);
    await hub.Clients.Group($"order_{o.Id}").SendAsync("OrderUpdated",payload);
}
