using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public enum AlarmCondition
{
    Below,
    Above,
    Equal
}

public class AlarmRule
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UnitId { get; set; }

    [Required]
    public string MeasurementType { get; set; } = string.Empty;

    [Required]
    public AlarmCondition Condition { get; set; }

    [Required]
    public double Threshold { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Cooldown in minutes before the alarm can fire again.
    /// </summary>
    public int CooldownMinutes { get; set; } = 60;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Unit? Unit { get; set; }
    public ICollection<AlarmEvent> Events { get; set; } = new List<AlarmEvent>();
}
