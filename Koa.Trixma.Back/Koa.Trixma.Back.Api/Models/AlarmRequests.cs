using System.ComponentModel.DataAnnotations;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Api.Models;

public class CreateAlarmRuleRequest
{
    [Required]
    public Guid UnitId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string MeasurementType { get; set; } = string.Empty;

    [Required]
    public AlarmCondition Condition { get; set; }

    [Required]
    public double Threshold { get; set; }

    public int CooldownMinutes { get; set; } = 60;
}

public class UpdateAlarmRuleRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string MeasurementType { get; set; } = string.Empty;

    [Required]
    public AlarmCondition Condition { get; set; }

    [Required]
    public double Threshold { get; set; }

    public int CooldownMinutes { get; set; } = 60;

    public bool Enabled { get; set; } = true;
}
