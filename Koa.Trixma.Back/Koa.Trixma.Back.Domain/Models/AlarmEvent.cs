using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public class AlarmEvent
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid AlarmRuleId { get; set; }

    public DateTime FiredAt { get; set; } = DateTime.UtcNow;

    public double ActualValue { get; set; }

    public string? Message { get; set; }

    public AlarmRule? AlarmRule { get; set; }
}
