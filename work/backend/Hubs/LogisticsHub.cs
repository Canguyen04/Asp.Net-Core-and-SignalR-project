using System.Security.Claims;
using Logistics.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
namespace Logistics.Api.Hubs;
[Authorize]
public class LogisticsHub(AppDbContext db) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var id = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = Context.User?.FindFirstValue(ClaimTypes.Role);
        if (id is not null) await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{id}");
        if (role is not null) await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role}");
        await base.OnConnectedAsync();
    }
    public async Task JoinOrder(int id)
    {
        int.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var uid);
        var role = Context.User?.FindFirstValue(ClaimTypes.Role);
        var permitted = await db.Orders.AnyAsync(o=>o.Id==id && (o.CustomerId==uid || o.DriverId==uid || role=="admin"));
        if (!permitted) throw new HubException("Bạn không có quyền theo dõi đơn này.");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order_{id}");
    }
    public Task LeaveOrder(int id) => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order_{id}");
}
