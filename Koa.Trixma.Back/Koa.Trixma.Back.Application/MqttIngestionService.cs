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

    public MqttIngestionService(
        IMqttService mqttService,
        IServiceScopeFactory scopeFactory,
        ILogger<MqttIngestionService> logger)
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
        var cellLocationService = scope.ServiceProvider.GetRequiredService<ICellLocationService>();

        // Look up unit by IMEI
        var unit = await unitRepository.GetByImeiAsync(imei);
        if (unit == null)
        {
            _logger.LogWarning("Unit not found for IMEI {Imei}", imei);
            return;
        }

        var items = new List<(string Type, double Value, DateTime? Timestamp)>();

        // Add measurements from the measurements array
        items.AddRange(message.Measurements
            .Where(m => !string.IsNullOrWhiteSpace(m.Type))
            .Select(m => (m.Type!, m.Value, m.Timestamp)));

        // Process LTE cell-site data if valid
        if (message.Lte?.Valid == true)
        {
            var lteData = message.Lte;
            if (lteData.Mcc.HasValue && lteData.Mnc.HasValue && lteData.Tac.HasValue && lteData.Eci.HasValue)
            {
                _logger.LogDebug(
                    "Cell-site data from IMEI {Imei}: MCC={Mcc}, MNC={Mnc}, TAC={Tac}, ECI={Eci}, EARFCN={Earfcn}, PCI={Pci}, Band={Band}, SNR={Snr}, RSRP={RsrpDbm}dBm, RSRQ={RsrqDbx10}/10dB",
                    imei, lteData.Mcc, lteData.Mnc, lteData.Tac, lteData.Eci, lteData.Earfcn, lteData.Pci, lteData.Band, lteData.Snr, lteData.RsrpDbm, lteData.RsrqDbx10);
                
                // Attempt cell-location lookup
                var cellLocation = await cellLocationService.LookupCellLocationAsync(
                    lteData.Mcc.Value, lteData.Mnc.Value, lteData.Tac.Value, lteData.Eci.Value);
                
                if (cellLocation.HasValue)
                {
                    unit.LastCellLatitude = cellLocation.Value.Latitude;
                    unit.LastCellLongitude = cellLocation.Value.Longitude;
                    unit.LastCellLocationTimestamp = DateTime.UtcNow;
                    await unitRepository.UpdateAsync(unit);
                    _logger.LogInformation(
                        "Updated cell location for unit {UnitId} (IMEI {Imei}) to Lat={Lat} Lon={Lon}",
                        unit.Id, imei, cellLocation.Value.Latitude, cellLocation.Value.Longitude);
                }
            }
        }
        else if (message.Lte != null)
        {
            _logger.LogDebug("LTE data marked invalid (valid={Valid}) for IMEI {Imei}", message.Lte.Valid, imei);
        }

        // Process GNSS data if present
        if (message.Gnss != null)
        {
            if (message.Gnss.LatUdeg.HasValue && message.Gnss.LonUdeg.HasValue)
            {
                // GNSS coordinates are in micro-degrees (udeg), store them as-is for GNSS measurements
                items.Add(("lat_udeg", message.Gnss.LatUdeg.Value, null));
                items.Add(("lon_udeg", message.Gnss.LonUdeg.Value, null));
                
                if (message.Gnss.AccCm.HasValue)
                {
                    items.Add(("acc_cm", message.Gnss.AccCm.Value, null));
                }
                
                _logger.LogDebug("GNSS data from IMEI {Imei}: lat_udeg={LatUdeg}, lon_udeg={LonUdeg}, acc_cm={AccCm}", 
                    imei, message.Gnss.LatUdeg, message.Gnss.LonUdeg, message.Gnss.AccCm);
            }
        }

        var ingested = await measurementService.IngestAsync(unit.Id.ToString(), items);
        if (!ingested)
            _logger.LogWarning("Telemetry ingestion failed for IMEI {Imei} (Unit {UnitId}) — no valid measurements", imei, unit.Id);
        else
            _logger.LogDebug("Ingested {Count} measurements from IMEI {Imei} (Unit {UnitId}) via MQTT", items.Count, imei, unit.Id);
    }

    private static bool IsValidImei(string imei)
    {
        // IMEI must be exactly 15 digits
        return imei.Length == 15 && imei.All(char.IsDigit);
    }

    private class TelemetryMessage
    {
        public List<TelemetryMeasurement> Measurements { get; set; } = new();
        public LteData? Lte { get; set; }
        public GnssData? Gnss { get; set; }
    }

    private class TelemetryMeasurement
    {
        public string? Type { get; set; }
        public double Value { get; set; }
        public DateTime? Timestamp { get; set; }
    }

    private class LteData
    {
        public bool Valid { get; set; }
        public int? Mcc { get; set; }       // Mobile Country Code
        public int? Mnc { get; set; }       // Mobile Network Code
        public int? Tac { get; set; }       // Tracking Area Code (decimal)
        public int? Eci { get; set; }       // E-UTRAN Cell ID (decimal)
        public int? Earfcn { get; set; }    // E-UTRA Absolute Radio Frequency Channel Number
        public int? Pci { get; set; }       // Physical Cell ID
        public int? Band { get; set; }      // LTE Band
        public int? Snr { get; set; }       // Signal-to-Noise Ratio
        public int? RsrpIdx { get; set; }   // RSRP index
        public int? RsrpDbm { get; set; }   // Reference Signal Received Power (dBm)
        public int? RsrqIdx { get; set; }   // RSRQ index
        public int? RsrqDbx10 { get; set; } // Reference Signal Received Quality (dB * 10)
    }

    private class GnssData
    {
        public int? LatUdeg { get; set; }   // Latitude in micro-degrees
        public int? LonUdeg { get; set; }   // Longitude in micro-degrees
        public int? AccCm { get; set; }     // Accuracy in centimeters
    }
}
