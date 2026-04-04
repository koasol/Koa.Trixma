using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

public class MqttIngestionService : IHostedService
{
    private const string TelemetryTopicFilter = "trixma/devices/+/telemetry"; // + = IMEI wildcard

    private readonly IMqttService _mqttService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MqttIngestionService> _logger;

    public MqttIngestionService(IMqttService mqttService, IServiceScopeFactory scopeFactory, ILogger<MqttIngestionService> logger)
    {
        _mqttService = mqttService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await _mqttService.SubscribeAsync(TelemetryTopicFilter, HandleTelemetryAsync);
        _logger.LogInformation("MQTT telemetry ingestion started, listening on {Filter}", TelemetryTopicFilter);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task HandleTelemetryAsync(string topic, string payload)
    {
        // Topic format: trixma/devices/{imei}/telemetry
        var parts = topic.Split('/');
        if (parts.Length < 4)
        {
            _logger.LogWarning("Received telemetry on unexpected topic: {Topic}", topic);
            return;
        }

        var imei = parts[2];

        // Validate IMEI format (15 digits)
        if (!IsValidImei(imei))
        {
            _logger.LogWarning("Invalid IMEI format in topic: {Imei}", imei);
            return;
        }

        TelemetryMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<TelemetryMessage>(payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize telemetry payload from IMEI {Imei}", imei);
            return;
        }

        if (message?.Measurements == null || message.Measurements.Count == 0)
        {
            _logger.LogWarning("Empty or null measurements in telemetry from IMEI {Imei}", imei);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var unitRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUnitRepository>();
        var measurementService = scope.ServiceProvider.GetRequiredService<IMeasurementService>();

        // Look up unit by IMEI
        var unit = await unitRepository.GetByImeiAsync(imei);
        if (unit == null)
        {
            _logger.LogWarning("Unit not found for IMEI {Imei}", imei);
            return;
        }

        var items = message.Measurements
            .Where(m => !string.IsNullOrWhiteSpace(m.Type))
            .Select(m => (m.Type!, m.Value, m.Timestamp));

        var ingested = await measurementService.IngestAsync(unit.Id.ToString(), items);
        if (!ingested)
            _logger.LogWarning("Telemetry ingestion failed for IMEI {Imei} (Unit {UnitId}) — no valid measurements", imei, unit.Id);
        else
            _logger.LogDebug("Ingested {Count} measurements from IMEI {Imei} (Unit {UnitId}) via MQTT", message.Measurements.Count, imei, unit.Id);
    }

    private static bool IsValidImei(string imei)
    {
        // IMEI must be exactly 15 digits
        return imei.Length == 15 && imei.All(char.IsDigit);
    }

    private class TelemetryMessage
    {
        public List<TelemetryMeasurement> Measurements { get; set; } = new();
    }

    private class TelemetryMeasurement
    {
        public string? Type { get; set; }
        public double Value { get; set; }
        public DateTime? Timestamp { get; set; }
    }
}
