using System.Text.Json.Serialization;

namespace Koa.Trixma.Back.Application;

public class MeasurementPoint
{
    public Guid UnitId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Value { get; set; }
}
