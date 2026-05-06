using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public class Unit
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? Imei { get; set; }

    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
    
    public DateTime? LastProvisionedAt { get; set; }
    public long? UptimeMs { get; set; }
    public int? BatteryMv { get; set; }
    public double? BatteryPercent { get; set; }
    public double? BatteryRemainingHours { get; set; }
    public double? BatteryDischargeRatePctPerHour { get; set; }
    public double? BatteryForecastConfidence { get; set; }
    public DateTime? BatteryForecastEstimatedAt { get; set; }
    public DateTime? BatteryForecastSegmentStartAt { get; set; }
    public string? BatteryForecastStatus { get; set; }

    /// <summary>Payload reporting interval in seconds, as reported by the device (CONFIG_MQTT_SAMPLE_TRIGGER_TIMEOUT_SECONDS).</summary>
    public int? PayloadIntervalS { get; set; }

    /// <summary>GNSS fix request interval in seconds. 0 = GNSS disabled, >0 = polling interval.</summary>
    public int? GnssRequestIntervalS { get; set; }

    public ICollection<Measurement> Measurements { get; set; } = new List<Measurement>();
}
