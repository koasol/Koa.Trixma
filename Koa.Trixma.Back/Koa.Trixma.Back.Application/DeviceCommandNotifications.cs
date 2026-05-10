namespace Koa.Trixma.Back.Application;

public class LocationPreciseAcceptedNotification
{
    public Guid UnitId { get; set; }
    public string Imei { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string? Detail { get; set; }
}

public interface IDeviceCommandNotifier
{
    Task NotifyLocationPreciseAcceptedAsync(string identityProviderId, LocationPreciseAcceptedNotification notification, CancellationToken cancellationToken = default);
}
