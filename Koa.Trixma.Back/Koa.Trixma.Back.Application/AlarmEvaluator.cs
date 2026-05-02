using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

public interface IAlarmEvaluator
{
    Task EvaluateAsync(IEnumerable<Measurement> measurements);
}

public class AlarmEvaluator : IAlarmEvaluator
{
    private readonly IAlarmRuleRepository _ruleRepository;
    private readonly IAlarmEventRepository _eventRepository;
    private readonly ILogger<AlarmEvaluator> _logger;

    public AlarmEvaluator(IAlarmRuleRepository ruleRepository, IAlarmEventRepository eventRepository, ILogger<AlarmEvaluator> logger)
    {
        _ruleRepository = ruleRepository;
        _eventRepository = eventRepository;
        _logger = logger;
    }

    public async Task EvaluateAsync(IEnumerable<Measurement> measurements)
    {
        foreach (var measurement in measurements)
        {
            var rules = await _ruleRepository.GetActiveByUnitIdAndTypeAsync(measurement.UnitId, measurement.Type);

            foreach (var rule in rules)
            {
                if (!IsThresholdViolated(rule, measurement.Value))
                    continue;

                if (await IsInCooldown(rule))
                    continue;

                _logger.LogWarning(
                    "ALARM TRIGGERED: Rule '{RuleName}' (Id: {RuleId}) on Unit {UnitId} — " +
                    "{MeasurementType} value {Value} is {Condition} threshold {Threshold}",
                    rule.Name, rule.Id, rule.UnitId,
                    measurement.Type, measurement.Value, rule.Condition, rule.Threshold);

                await _eventRepository.CreateAsync(new AlarmEvent
                {
                    AlarmRuleId = rule.Id,
                    ActualValue = measurement.Value,
                    FiredAt = DateTime.UtcNow,
                    Message = $"{rule.Name}: {measurement.Type} value {measurement.Value} is {rule.Condition.ToString().ToLower()} threshold {rule.Threshold}"
                });
            }
        }
    }

    private static bool IsThresholdViolated(AlarmRule rule, double value)
    {
        return rule.Condition switch
        {
            AlarmCondition.Below => value < rule.Threshold,
            AlarmCondition.Above => value > rule.Threshold,
            AlarmCondition.Equal => Math.Abs(value - rule.Threshold) < 0.0001,
            _ => false
        };
    }

    private async Task<bool> IsInCooldown(AlarmRule rule)
    {
        var lastEvent = await _eventRepository.GetLatestByRuleIdAsync(rule.Id);
        if (lastEvent == null) return false;

        return DateTime.UtcNow - lastEvent.FiredAt < TimeSpan.FromMinutes(rule.CooldownMinutes);
    }
}
