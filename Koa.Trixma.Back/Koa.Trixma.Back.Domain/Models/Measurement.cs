using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Koa.Trixma.Back.Domain.Models;

public class Measurement
{
    public Guid Id { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Required]
    public string Type { get; set; } = string.Empty;

    [Required]
    public double Value { get; set; }

    public Guid UnitId { get; set; }
    [JsonIgnore]
    public Unit? Unit { get; set; }
}
