using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface IMeasurementService
{
    Task<bool> IngestAsync(string deviceId, IEnumerable<(string Type, double Value, DateTime? Timestamp)> items, string? imei = null);
    Task<IDictionary<string, IEnumerable<MeasurementPoint>>> GetByUnitIdAsync(Guid unitId, DateTime from, DateTime to, Guid ownedBy);
    Task<IDictionary<string, IEnumerable<MeasurementPoint>>> GetBySystemIdAsync(Guid systemId, DateTime from, DateTime to, Guid ownedBy);
}

public class MeasurementService : IMeasurementService
{
    private readonly IUnitRepository _unitRepository;
    private readonly IMeasurementRepository _measurementRepository;
    private readonly ISystemRepository _systemRepository;

    public MeasurementService(IUnitRepository unitRepository, IMeasurementRepository measurementRepository, ISystemRepository systemRepository)
    {
        _unitRepository = unitRepository;
        _measurementRepository = measurementRepository;
        _systemRepository = systemRepository;
    }

    public async Task<bool> IngestAsync(string deviceId, IEnumerable<(string Type, double Value, DateTime? Timestamp)> items, string? imei = null)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) return false;
        var unit = await _unitRepository.GetByDeviceIdAsync(deviceId.Trim());
        if (unit == null) return false;

        // Validate and update IMEI if provided
        if (!string.IsNullOrWhiteSpace(imei))
        {
            var trimmedImei = imei.Trim();
            if (IsValidImei(trimmedImei) && unit.Imei != trimmedImei)
            {
                unit.Imei = trimmedImei;
                await _unitRepository.UpdateAsync(unit);
            }
        }

        var now = DateTime.UtcNow;
        var measurements = items
            .Where(i => !string.IsNullOrWhiteSpace(i.Type))
            .Select(i => new Measurement
            {
                Id = Guid.NewGuid(),
                UnitId = unit.Id,
                Type = i.Type.Trim(),
                Value = i.Value,
                Timestamp = i.Timestamp ?? now
            })
            .ToList();

        if (measurements.Count == 0) return false;

        await _measurementRepository.AddRangeAsync(measurements);
        return true;
    }

    private static bool IsValidImei(string imei)
    {
        // IMEI must be exactly 15 digits
        return imei.Length == 15 && imei.All(char.IsDigit);
    }

    public async Task<IDictionary<string, IEnumerable<MeasurementPoint>>> GetByUnitIdAsync(Guid unitId, DateTime from, DateTime to, Guid ownedBy)
    {
        var unit = await _unitRepository.GetByIdAndOwnerAsync(unitId, ownedBy);
        if (unit == null) return new Dictionary<string, IEnumerable<MeasurementPoint>>();

        var rawMeasurements = await _measurementRepository.GetByUnitIdAndDateRangeAsync(unitId, from, to);
        return GroupByType(rawMeasurements);
    }

    public async Task<IDictionary<string, IEnumerable<MeasurementPoint>>> GetBySystemIdAsync(Guid systemId, DateTime from, DateTime to, Guid ownedBy)
    {
        var system = await _systemRepository.GetByIdAndOwnerAsync(systemId, ownedBy);
        if (system == null) return new Dictionary<string, IEnumerable<MeasurementPoint>>();

        var rawMeasurements = await _measurementRepository.GetBySystemIdAndDateRangeAsync(systemId, from, to);
        return GroupByType(rawMeasurements);
    }

    private IDictionary<string, IEnumerable<MeasurementPoint>> GroupByType(IEnumerable<Measurement> rawMeasurements)
    {
        return rawMeasurements
            .GroupBy(m => m.Type)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(m => m.Timestamp)
                      .Select(m => new MeasurementPoint
                      {
                          UnitId = m.UnitId,
                          Timestamp = m.Timestamp,
                          Value = m.Value
                      })
                      .AsEnumerable()
            );
    }
}