using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface IAlarmRuleService
{
    Task<AlarmRule?> GetByIdAsync(Guid id);
    Task<IEnumerable<AlarmRule>> GetByUnitIdAsync(Guid unitId);
    Task<Guid> CreateAsync(Guid unitId, string name, string measurementType, AlarmCondition condition, double threshold, int cooldownMinutes);
    Task<bool> UpdateAsync(Guid id, string name, string measurementType, AlarmCondition condition, double threshold, int cooldownMinutes, bool enabled);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<AlarmEvent>> GetEventsAsync(Guid ruleId);
}

public class AlarmRuleService : IAlarmRuleService
{
    private readonly IAlarmRuleRepository _ruleRepository;
    private readonly IAlarmEventRepository _eventRepository;

    public AlarmRuleService(IAlarmRuleRepository ruleRepository, IAlarmEventRepository eventRepository)
    {
        _ruleRepository = ruleRepository;
        _eventRepository = eventRepository;
    }

    public async Task<AlarmRule?> GetByIdAsync(Guid id)
    {
        return await _ruleRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<AlarmRule>> GetByUnitIdAsync(Guid unitId)
    {
        return await _ruleRepository.GetByUnitIdAsync(unitId);
    }

    public async Task<Guid> CreateAsync(Guid unitId, string name, string measurementType, AlarmCondition condition, double threshold, int cooldownMinutes)
    {
        var rule = new AlarmRule
        {
            UnitId = unitId,
            Name = name,
            MeasurementType = measurementType,
            Condition = condition,
            Threshold = threshold,
            CooldownMinutes = cooldownMinutes,
            Enabled = true
        };

        return await _ruleRepository.CreateAsync(rule);
    }

    public async Task<bool> UpdateAsync(Guid id, string name, string measurementType, AlarmCondition condition, double threshold, int cooldownMinutes, bool enabled)
    {
        var rule = await _ruleRepository.GetByIdAsync(id);
        if (rule == null) return false;

        rule.Name = name;
        rule.MeasurementType = measurementType;
        rule.Condition = condition;
        rule.Threshold = threshold;
        rule.CooldownMinutes = cooldownMinutes;
        rule.Enabled = enabled;

        await _ruleRepository.UpdateAsync(rule);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var rule = await _ruleRepository.GetByIdAsync(id);
        if (rule == null) return false;

        await _ruleRepository.DeleteAsync(id);
        return true;
    }

    public async Task<IEnumerable<AlarmEvent>> GetEventsAsync(Guid ruleId)
    {
        return await _eventRepository.GetByRuleIdAsync(ruleId);
    }
}
