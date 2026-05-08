using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public class UnitProvisioningStatus
{
    public string Imei { get; set; } = string.Empty;
    public bool Exists { get; set; }
    public bool CanProvision { get; set; }
    public bool IsOwnedByCurrentUser { get; set; }
    public bool IsAssigned { get; set; }
    public Guid? UnitId { get; set; }
    public Guid? SystemId { get; set; }
    public string? SystemName { get; set; }
}

public interface IUnitService
{
    Task<IEnumerable<Unit>> GetAllUnitsAsync(Guid ownedBy);
    Task<IEnumerable<Unit>> GetUnitsBySystemIdAsync(Guid systemId);
    Task<Unit?> GetUnitByIdAsync(Guid id, Guid ownedBy);
    Task<Guid> CreateUnitAsync(string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, string? imei, Guid ownedBy);
    Task UpdateUnitAsync(Guid id, string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, string? imei, Guid ownedBy);
    Task DeleteUnitAsync(Guid id, Guid ownedBy);
    Task<Guid> RegisterUnitAsync(string name, string? macAddress, string ipAddress);
    Task<UnitProvisioningStatus> GetProvisioningStatusAsync(string imei, Guid ownedBy);
    Task<Unit> ProvisionUnitAsync(string imei, Guid ownedBy, Guid? systemId);
}

public class UnitService : IUnitService
{
    private readonly IUnitRepository _unitRepository;
    private readonly ISystemRepository _systemRepository;
    
    public UnitService(IUnitRepository unitRepository, ISystemRepository systemRepository)
    {
        _unitRepository = unitRepository;
        _systemRepository = systemRepository;
    }

    public async Task<IEnumerable<Unit>> GetAllUnitsAsync(Guid ownedBy)
    {
        return await _unitRepository.GetAllByOwnerAsync(ownedBy);
    }

    public async Task<IEnumerable<Unit>> GetUnitsBySystemIdAsync(Guid systemId)
    {
        return await _unitRepository.GetBySystemIdAsync(systemId);
    }

    public async Task<Unit?> GetUnitByIdAsync(Guid id, Guid ownedBy)
    {
        return await _unitRepository.GetByIdAndOwnerAsync(id, ownedBy);
    }

    public async Task<Guid> CreateUnitAsync(string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, string? imei, Guid ownedBy)
    {
        var unit = new Unit
        {
            OwnedBy = ownedBy,
            Name = name,
            MacAddress = macAddress,
            IpAddress = ipAddress,
            Imei = imei,
            SystemId = systemId,
            nfcId = nfcId,
            LastProvisionedAt = DateTime.UtcNow
        };
        return await _unitRepository.CreateAsync(unit);
    }

    public async Task UpdateUnitAsync(Guid id, string name, string? macAddress, string? ipAddress, Guid? systemId, string? nfcId, string? imei, Guid ownedBy)
    {
        var unit = await _unitRepository.GetByIdAndOwnerAsync(id, ownedBy);
        if (unit != null)
        {
            unit.Name = name;
            unit.MacAddress = macAddress;
            unit.IpAddress = ipAddress;
            unit.Imei = imei;
            unit.SystemId = systemId;
            unit.nfcId = nfcId;
            await _unitRepository.UpdateAsync(unit);
        }
    }

    public async Task DeleteUnitAsync(Guid id, Guid ownedBy)
    {
        await _unitRepository.DeleteAsync(id, ownedBy);
    }

    public async Task<UnitProvisioningStatus> GetProvisioningStatusAsync(string imei, Guid ownedBy)
    {
        if (string.IsNullOrWhiteSpace(imei))
        {
            throw new ArgumentException("IMEI is required", nameof(imei));
        }

        var normalizedImei = imei.Trim();
        var unit = await _unitRepository.GetByImeiAsync(normalizedImei);
        if (unit == null)
        {
            return new UnitProvisioningStatus
            {
                Imei = normalizedImei,
                Exists = false,
                CanProvision = true,
                IsOwnedByCurrentUser = false,
                IsAssigned = false,
            };
        }

        var isOwnedByCurrentUser = unit.OwnedBy == ownedBy;
        string? systemName = null;
        if (isOwnedByCurrentUser && unit.SystemId.HasValue)
        {
            var system = await _systemRepository.GetByIdAndOwnerAsync(unit.SystemId.Value, ownedBy);
            systemName = system?.Name;
        }

        return new UnitProvisioningStatus
        {
            Imei = normalizedImei,
            Exists = true,
            CanProvision = !unit.OwnedBy.HasValue || isOwnedByCurrentUser,
            IsOwnedByCurrentUser = isOwnedByCurrentUser,
            IsAssigned = unit.SystemId.HasValue,
            UnitId = unit.Id,
            SystemId = unit.SystemId,
            SystemName = isOwnedByCurrentUser ? systemName : null,
        };
    }

    public async Task<Unit> ProvisionUnitAsync(string imei, Guid ownedBy, Guid? systemId)
    {
        if (string.IsNullOrWhiteSpace(imei))
        {
            throw new ArgumentException("IMEI is required", nameof(imei));
        }

        var normalizedImei = imei.Trim();
        if (systemId.HasValue)
        {
            var system = await _systemRepository.GetByIdAndOwnerAsync(systemId.Value, ownedBy);
            if (system == null)
            {
                throw new InvalidOperationException("Selected system was not found for the current user");
            }
        }

        var existingUnit = await _unitRepository.GetByImeiAsync(normalizedImei);
        if (existingUnit == null)
        {
            existingUnit = new Unit
            {
                Id = Guid.NewGuid(),
                OwnedBy = ownedBy,
                Name = $"Unit {normalizedImei}",
                Imei = normalizedImei,
                SystemId = systemId,
                LastProvisionedAt = DateTime.UtcNow,
            };

            await _unitRepository.CreateAsync(existingUnit);
            return existingUnit;
        }

        if (existingUnit.OwnedBy.HasValue && existingUnit.OwnedBy != ownedBy)
        {
            throw new InvalidOperationException("This unit is already linked to another user");
        }

        existingUnit.OwnedBy = ownedBy;
        existingUnit.Imei = normalizedImei;
        existingUnit.SystemId = systemId;
        existingUnit.LastProvisionedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(existingUnit.Name))
        {
            existingUnit.Name = $"Unit {normalizedImei}";
        }

        await _unitRepository.UpdateAsync(existingUnit);
        return existingUnit;
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
