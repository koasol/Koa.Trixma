using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Repositories;

public interface IMeasurementRepository
{
    Task AddRangeAsync(IEnumerable<Measurement> measurements);
    Task<IEnumerable<Measurement>> GetByUnitIdAndDateRangeAsync(Guid unitId, DateTime from, DateTime to);
    Task<IEnumerable<Measurement>> GetBySystemIdAndDateRangeAsync(Guid systemId, DateTime from, DateTime to);
    Task<IEnumerable<Measurement>> GetRecentByUnitAndTypeAsync(Guid unitId, string type, DateTime from, int maxPoints);
}

public class MeasurementRepository : IMeasurementRepository
{
    private readonly TrixmaDbContext _context;

    public MeasurementRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task AddRangeAsync(IEnumerable<Measurement> measurements)
    {
        await _context.Measurements.AddRangeAsync(measurements);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Measurement>> GetByUnitIdAndDateRangeAsync(Guid unitId, DateTime from, DateTime to)
    {
        return await _context.Measurements
            .Where(m => m.UnitId == unitId && m.Timestamp >= from && m.Timestamp <= to)
            .OrderByDescending(m => m.Timestamp)
            .ToListAsync();
    }

    public async Task<IEnumerable<Measurement>> GetBySystemIdAndDateRangeAsync(Guid systemId, DateTime from, DateTime to)
    {
        return await _context.Measurements
            .Include(m => m.Unit)
            .Where(m => m.Unit != null && m.Unit.SystemId == systemId && m.Timestamp >= from && m.Timestamp <= to)
            .OrderByDescending(m => m.Timestamp)
            .ToListAsync();
    }

    public async Task<IEnumerable<Measurement>> GetRecentByUnitAndTypeAsync(Guid unitId, string type, DateTime from, int maxPoints)
    {
        return await _context.Measurements
            .Where(m => m.UnitId == unitId
                        && m.Type == type
                        && m.Timestamp >= from)
            .OrderByDescending(m => m.Timestamp)
            .Take(maxPoints)
            .ToListAsync();
    }
}