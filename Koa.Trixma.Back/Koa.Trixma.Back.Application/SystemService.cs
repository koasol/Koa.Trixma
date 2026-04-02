using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface ISystemService
{
    Task<IEnumerable<Koa.Trixma.Back.Domain.Models.System>> GetAllSystemsAsync(Guid ownedBy);
    Task<Koa.Trixma.Back.Domain.Models.System?> GetSystemByIdAsync(Guid id, Guid ownedBy);
    Task<Guid> CreateSystemAsync(string name, string? description, Guid ownedBy);
    Task UpdateSystemAsync(Guid id, string name, string? description, Guid ownedBy);
    Task DeleteSystemAsync(Guid id, Guid ownedBy);
}

public class SystemService : ISystemService
{
    private readonly ISystemRepository _systemRepository;
    public SystemService(ISystemRepository systemRepository)
    {
        _systemRepository = systemRepository;
    }

    public async Task<IEnumerable<Koa.Trixma.Back.Domain.Models.System>> GetAllSystemsAsync(Guid ownedBy)
    {
        return await _systemRepository.GetAllByOwnerAsync(ownedBy);
    }

    public async Task<Koa.Trixma.Back.Domain.Models.System?> GetSystemByIdAsync(Guid id, Guid ownedBy)
    {
        return await _systemRepository.GetByIdAndOwnerAsync(id, ownedBy);
    }

    public async Task<Guid> CreateSystemAsync(string name, string? description, Guid ownedBy)
    {
        var system = new Koa.Trixma.Back.Domain.Models.System
        {
            Name = name,
            Description = description,
            OwnedBy = ownedBy,
            CreatedAt = DateTime.UtcNow
        };
        return await _systemRepository.CreateAsync(system);
    }

    public async Task UpdateSystemAsync(Guid id, string name, string? description, Guid ownedBy)
    {
        var system = await _systemRepository.GetByIdAndOwnerAsync(id, ownedBy);
        if (system != null)
        {
            system.Name = name;
            system.Description = description;
            await _systemRepository.UpdateAsync(system);
        }
    }

    public async Task DeleteSystemAsync(Guid id, Guid ownedBy)
    {
        await _systemRepository.DeleteAsync(id, ownedBy);
    }
}
