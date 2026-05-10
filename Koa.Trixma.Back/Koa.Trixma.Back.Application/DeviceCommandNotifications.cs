namespace Koa.Trixma.Back.Application;

public class LocationPreciseStatusNotification
{
    public Guid UnitId { get; set; }
    public string Imei { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string? Detail { get; set; }
}

public interface IDeviceCommandNotifier
{
    Task NotifyLocationPreciseStatusAsync(string identityProviderId, LocationPreciseStatusNotification notification, CancellationToken cancellationToken = default);
}
