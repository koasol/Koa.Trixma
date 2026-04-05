using System.Text.Json.Serialization;

namespace Koa.Trixma.Back.Application;

// Used for system-level aggregated measurements (multiple units)
public class MeasurementPoint
{
    public Guid UnitId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Value { get; set; }
}

// A single data point within a unit's measurement group
public class MeasurementDataPoint
{
    public DateTime Timestamp { get; set; }
    public double Value { get; set; }
}

// One sensor type and its time-series data
public class MeasurementGroup
{
    public string Type { get; set; } = string.Empty;
    public List<MeasurementDataPoint> Data { get; set; } = new();
}


