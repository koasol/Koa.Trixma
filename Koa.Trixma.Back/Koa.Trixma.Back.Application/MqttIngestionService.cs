using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

public class MqttIngestionService : IHostedService
{
    private const string TelemetryTopicFilter = "trixma/devices/+/telemetry";

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
        // Topic format: trixma/devices/{deviceId}/telemetry
        var parts = topic.Split('/');
        if (parts.Length < 4)
        {
            _logger.LogWarning("Received telemetry on unexpected topic: {Topic}", topic);
            return;
        }

        var deviceId = parts[2];

        TelemetryMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<TelemetryMessage>(payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize telemetry payload from device {DeviceId}", deviceId);
            return;
        }

        if (message?.Measurements == null || message.Measurements.Count == 0)
        {
            _logger.LogWarning("Empty or null measurements in telemetry from device {DeviceId}", deviceId);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var measurementService = scope.ServiceProvider.GetRequiredService<IMeasurementService>();

        var items = message.Measurements
            .Where(m => !string.IsNullOrWhiteSpace(m.Type))
            .Select(m => (m.Type!, m.Value, m.Timestamp));

        var ingested = await measurementService.IngestAsync(deviceId, items, message.Imei);
        if (!ingested)
            _logger.LogWarning("Telemetry ingestion failed for device {DeviceId} — device not found or no valid measurements", deviceId);
        else
            _logger.LogDebug("Ingested {Count} measurements from device {DeviceId} via MQTT", message.Measurements.Count, deviceId);
    }

    private class TelemetryMessage
    {
        public List<TelemetryMeasurement> Measurements { get; set; } = new();
        public string? Imei { get; set; }
    }

    private class TelemetryMeasurement
    {
        public string? Type { get; set; }
        public double Value { get; set; }
        public DateTime? Timestamp { get; set; }
    }
}
