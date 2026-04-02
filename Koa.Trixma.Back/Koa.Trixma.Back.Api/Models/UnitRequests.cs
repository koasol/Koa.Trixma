namespace Koa.Trixma.Back.Api.Models;

public class UnitCreateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string? IpAddress { get; set; }
    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
}

public class UnitUpdateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string? IpAddress { get; set; }
    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
}
