namespace Koa.Trixma.Back.Api.Models;

public class UnitCreateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string? IpAddress { get; set; }
    public string? Imei { get; set; }
    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
}

public class UnitUpdateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string? IpAddress { get; set; }
    public string? Imei { get; set; }
    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
}

public class UnitProvisioningRequest
{
    public string Imei { get; set; } = string.Empty;
    public Guid? SystemId { get; set; }
}

public class LocationPreciseRequestCommand
{
    public string? RequestId { get; set; }
    public int MaxWaitS { get; set; } = 120;
    public int MinAccCm { get; set; } = 5000;
}
