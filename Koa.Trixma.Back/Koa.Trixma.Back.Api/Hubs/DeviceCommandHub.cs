using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Koa.Trixma.Back.Api.Hubs;

[Authorize]
public class DeviceCommandHub : Hub
{
    private static string GetUserGroup(string identityProviderId) => $"user:{identityProviderId}";

    public override async Task OnConnectedAsync()
    {
        var identityProviderId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(identityProviderId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroup(identityProviderId));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var identityProviderId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(identityProviderId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroup(identityProviderId));
        }

        await base.OnDisconnectedAsync(exception);
    }
}
