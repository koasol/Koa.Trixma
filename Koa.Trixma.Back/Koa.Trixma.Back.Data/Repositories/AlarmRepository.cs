using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Repositories;

public interface IAlarmRuleRepository
{
    Task<AlarmRule?> GetByIdAsync(Guid id);
    Task<IEnumerable<AlarmRule>> GetByUnitIdAsync(Guid unitId);
    Task<IEnumerable<AlarmRule>> GetActiveByUnitIdAndTypeAsync(Guid unitId, string measurementType);
    Task<Guid> CreateAsync(AlarmRule rule);
    Task UpdateAsync(AlarmRule rule);
    Task DeleteAsync(Guid id);
}

public interface IAlarmEventRepository
{
    Task<AlarmEvent?> GetLatestByRuleIdAsync(Guid alarmRuleId);
    Task CreateAsync(AlarmEvent alarmEvent);
    Task<IEnumerable<AlarmEvent>> GetByRuleIdAsync(Guid alarmRuleId);
}

public class AlarmRuleRepository : IAlarmRuleRepository
{
    private readonly TrixmaDbContext _context;

    public AlarmRuleRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task<AlarmRule?> GetByIdAsync(Guid id)
    {
        return await _context.AlarmRules.FindAsync(id);
    }

    public async Task<IEnumerable<AlarmRule>> GetByUnitIdAsync(Guid unitId)
    {
        return await _context.AlarmRules
            .Where(r => r.UnitId == unitId)
            .ToListAsync();
    }

    public async Task<IEnumerable<AlarmRule>> GetActiveByUnitIdAndTypeAsync(Guid unitId, string measurementType)
    {
        return await _context.AlarmRules
            .Where(r => r.UnitId == unitId && r.MeasurementType == measurementType && r.Enabled)
            .ToListAsync();
    }

    public async Task<Guid> CreateAsync(AlarmRule rule)
    {
        rule.Id = Guid.NewGuid();
        rule.CreatedAt = DateTime.UtcNow;
        await _context.AlarmRules.AddAsync(rule);
        await _context.SaveChangesAsync();
        return rule.Id;
    }

    public async Task UpdateAsync(AlarmRule rule)
    {
        _context.AlarmRules.Update(rule);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var rule = await _context.AlarmRules.FindAsync(id);
        if (rule != null)
        {
            _context.AlarmRules.Remove(rule);
            await _context.SaveChangesAsync();
        }
    }
}

public class AlarmEventRepository : IAlarmEventRepository
{
    private readonly TrixmaDbContext _context;

    public AlarmEventRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task<AlarmEvent?> GetLatestByRuleIdAsync(Guid alarmRuleId)
    {
        return await _context.AlarmEvents
            .Where(e => e.AlarmRuleId == alarmRuleId)
            .OrderByDescending(e => e.FiredAt)
            .FirstOrDefaultAsync();
    }

    public async Task CreateAsync(AlarmEvent alarmEvent)
    {
        alarmEvent.Id = Guid.NewGuid();
        await _context.AlarmEvents.AddAsync(alarmEvent);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<AlarmEvent>> GetByRuleIdAsync(Guid alarmRuleId)
    {
        return await _context.AlarmEvents
            .Where(e => e.AlarmRuleId == alarmRuleId)
            .OrderByDescending(e => e.FiredAt)
            .ToListAsync();
    }
}
