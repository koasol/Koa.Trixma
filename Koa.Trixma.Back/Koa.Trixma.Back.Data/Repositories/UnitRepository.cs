using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Repositories;

public interface IUnitRepository
{
    Task<IEnumerable<Unit>> GetAllByOwnerAsync(Guid ownedBy);
    Task<IEnumerable<Unit>> GetBySystemIdAsync(Guid systemId);
    Task<Unit?> GetByIdAndOwnerAsync(Guid id, Guid ownedBy);
    Task<Unit?> GetByDeviceIdAsync(string deviceId);
    Task<Unit?> GetByImeiAsync(string imei);
    Task<Guid> CreateAsync(Unit unit);
    Task UpdateAsync(Unit unit);
    Task DeleteAsync(Guid id, Guid ownedBy);
}

public class UnitRepository : IUnitRepository
{
    private readonly TrixmaDbContext _context;

    public UnitRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Unit>> GetAllByOwnerAsync(Guid ownedBy)
    {
        return await _context.Units
            .Where(u => u.OwnedBy == ownedBy)
            .ToListAsync();
    }

    public async Task<IEnumerable<Unit>> GetBySystemIdAsync(Guid systemId)
    {
        return await _context.Units
            .Where(u => u.SystemId == systemId)
            .ToListAsync();
    }

    public async Task<Unit?> GetByIdAndOwnerAsync(Guid id, Guid ownedBy)
    {
        return await _context.Units
            .Where(u => u.Id == id && u.OwnedBy == ownedBy)
            .FirstOrDefaultAsync();
    }

    public async Task<Unit?> GetByDeviceIdAsync(string deviceId)
    {
        Guid parsedId;
        var isGuid = Guid.TryParse(deviceId, out parsedId);
        return await _context.Units
            .Where(u => (isGuid && u.Id == parsedId) || u.MacAddress == deviceId || u.nfcId == deviceId)
            .FirstOrDefaultAsync();
    }

    public async Task<Unit?> GetByImeiAsync(string imei)
    {
        if (string.IsNullOrWhiteSpace(imei)) return null;
        return await _context.Units
            .Where(u => u.Imei == imei)
            .FirstOrDefaultAsync();
    }

    public async Task<Guid> CreateAsync(Unit unit)
    {
        if (unit.Id == Guid.Empty)
        {
            unit.Id = Guid.NewGuid();
        }
        await _context.Units.AddAsync(unit);
        await _context.SaveChangesAsync();
        return unit.Id;
    }

    public async Task UpdateAsync(Unit unit)
    {
        _context.Units.Update(unit);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id, Guid ownedBy)
    {
        var unit = await GetByIdAndOwnerAsync(id, ownedBy);
        if (unit != null)
        {
            _context.Units.Remove(unit);
            await _context.SaveChangesAsync();
        }
    }
}
