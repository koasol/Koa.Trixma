using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Repositories;

public interface ISystemRepository
{
    Task<IEnumerable<Koa.Trixma.Back.Domain.Models.System>> GetAllByOwnerAsync(Guid ownedBy);
    Task<Koa.Trixma.Back.Domain.Models.System?> GetByIdAndOwnerAsync(Guid id, Guid ownedBy);
    Task<Guid> CreateAsync(Koa.Trixma.Back.Domain.Models.System system);
    Task UpdateAsync(Koa.Trixma.Back.Domain.Models.System system);
    Task DeleteAsync(Guid id, Guid ownedBy);
}

public class SystemRepository : ISystemRepository
{
    private readonly TrixmaDbContext _context;

    public SystemRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Koa.Trixma.Back.Domain.Models.System>> GetAllByOwnerAsync(Guid ownedBy)
    {
        return await _context.Systems
            .Include(s => s.Units)
            .Where(s => s.OwnedBy == ownedBy)
            .ToListAsync();
    }

    public async Task<Koa.Trixma.Back.Domain.Models.System?> GetByIdAndOwnerAsync(Guid id, Guid ownedBy)
    {
        return await _context.Systems
            .Include(s => s.Units)
            .FirstOrDefaultAsync(s => s.Id == id && s.OwnedBy == ownedBy);
    }

    public async Task<Guid> CreateAsync(Koa.Trixma.Back.Domain.Models.System system)
    {
        if (system.Id == Guid.Empty)
        {
            system.Id = Guid.NewGuid();
        }
        await _context.Systems.AddAsync(system);
        await _context.SaveChangesAsync();
        return system.Id;
    }

    public async Task UpdateAsync(Koa.Trixma.Back.Domain.Models.System system)
    {
        _context.Systems.Update(system);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id, Guid ownedBy)
    {
        var system = await _context.Systems.FirstOrDefaultAsync(s => s.Id == id && s.OwnedBy == ownedBy);
        if (system != null)
        {
            _context.Systems.Remove(system);
            await _context.SaveChangesAsync();
        }
    }
}
