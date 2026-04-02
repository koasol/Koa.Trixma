using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface IUnitService
{
    Task<IEnumerable<Unit>> GetAllUnitsAsync(Guid ownedBy);
    Task<IEnumerable<Unit>> GetUnitsBySystemIdAsync(Guid systemId);
    Task<Unit?> GetUnitByIdAsync(Guid id, Guid ownedBy);
    Task<Guid> CreateUnitAsync(string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId);
    Task UpdateUnitAsync(Guid id, string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, Guid ownedBy);
    Task DeleteUnitAsync(Guid id, Guid ownedBy);
    Task<Guid> RegisterUnitAsync(string name, string? macAddress, string ipAddress);
}

public class UnitService : IUnitService
{
    private readonly IUnitRepository _unitRepository;
    
    public UnitService(IUnitRepository unitRepository)
    {
        _unitRepository = unitRepository;
    }

    public async Task<IEnumerable<Unit>> GetAllUnitsAsync(Guid ownedBy)
    {
        return await _unitRepository.GetAllBySystemOwnerAsync(ownedBy);
    }

    public async Task<IEnumerable<Unit>> GetUnitsBySystemIdAsync(Guid systemId)
    {
        return await _unitRepository.GetBySystemIdAsync(systemId);
    }

    public async Task<Unit?> GetUnitByIdAsync(Guid id, Guid ownedBy)
    {
        return await _unitRepository.GetByIdAndOwnerAsync(id, ownedBy);
    }

    public async Task<Guid> CreateUnitAsync(string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId)
    {
        var unit = new Unit
        {
            Name = name,
            MacAddress = macAddress,
            IpAddress = ipAddress,
            SystemId = systemId,
            nfcId = nfcId,
            LastProvisionedAt = DateTime.UtcNow
        };
        return await _unitRepository.CreateAsync(unit);
    }

    public async Task UpdateUnitAsync(Guid id, string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, Guid ownedBy)
    {
        var unit = await _unitRepository.GetByIdAndOwnerAsync(id, ownedBy);
        if (unit != null)
        {
            unit.Name = name;
            unit.MacAddress = macAddress;
            unit.IpAddress = ipAddress;
            unit.SystemId = systemId;
            unit.nfcId = nfcId;
            await _unitRepository.UpdateAsync(unit);
        }
    }

    public async Task DeleteUnitAsync(Guid id, Guid ownedBy)
    {
        await _unitRepository.DeleteAsync(id, ownedBy);
    }

    public async Task<Guid> RegisterUnitAsync(string name, string? macAddress, string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required", nameof(name));
        var unit = new Unit
        {
            Name = name.Trim(),
            MacAddress = string.IsNullOrWhiteSpace(macAddress) ? null : macAddress!.Trim(),
            IpAddress = ipAddress,
            LastProvisionedAt = DateTime.UtcNow
        };
        return await _unitRepository.CreateAsync(unit);
    }
}
