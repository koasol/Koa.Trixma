using Koa.Trixma.Back.Api.Hubs;
using Koa.Trixma.Back.Application;
using Microsoft.AspNetCore.SignalR;

namespace Koa.Trixma.Back.Api.Services;

public class SignalRDeviceCommandNotifier : IDeviceCommandNotifier
{
    private readonly IHubContext<DeviceCommandHub> _hubContext;

    public SignalRDeviceCommandNotifier(IHubContext<DeviceCommandHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task NotifyLocationPreciseStatusAsync(string identityProviderId, LocationPreciseStatusNotification notification, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(GetUserGroup(identityProviderId))
            .SendAsync("locationPreciseStatus", notification, cancellationToken);
    }

    private static string GetUserGroup(string identityProviderId) => $"user:{identityProviderId}";
}
