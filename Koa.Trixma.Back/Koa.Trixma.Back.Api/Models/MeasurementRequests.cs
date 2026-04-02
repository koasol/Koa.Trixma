namespace Koa.Trixma.Back.Api.Models;

public class MeasurementItemDto
{
    public string Type { get; set; } = string.Empty;
    public double Value { get; set; }
    public DateTime? Timestamp { get; set; }
}

public class MeasurementReportRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public List<MeasurementItemDto> Measurements { get; set; } = new();
}