using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

public class CmdResponseIngestionService : IHostedService
{
    private const string CmdResponseTopicFilter = "trixma/devices/+/cmd/response";

    private readonly IMqttService _mqttService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDeviceCommandNotifier _deviceCommandNotifier;
    private readonly ILogger<CmdResponseIngestionService> _logger;

    public CmdResponseIngestionService(
        IMqttService mqttService,
        IServiceScopeFactory scopeFactory,
        IDeviceCommandNotifier deviceCommandNotifier,
        ILogger<CmdResponseIngestionService> logger)
    {
        _mqttService = mqttService;
        _scopeFactory = scopeFactory;
        _deviceCommandNotifier = deviceCommandNotifier;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await _mqttService.SubscribeAsync(CmdResponseTopicFilter, HandleCmdResponseAsync);
        _logger.LogInformation("CMD response ingestion started, listening on {Filter}", CmdResponseTopicFilter);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task HandleCmdResponseAsync(string topic, string payload)
    {
        // Topic format: trixma/devices/{imei}/cmd/response
        var parts = topic.Split('/');
        if (parts.Length < 5) return;

        var imei = parts[2];

        CmdResponse? response;
        try
        {
            response = JsonSerializer.Deserialize<CmdResponse>(payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize cmd response from IMEI {Imei}", imei);
            return;
        }

        if (response == null) return;

        if (response.Type == "freq" && response.Result == "ok")
        {
            await HandleFreqResponseAsync(imei, response);
        }
        else if (response.Type == "gnss" && response.Result == "ok")
        {
            await HandleGnssResponseAsync(imei, response);
        }
        else if (response.Type == "location.precise" && response.Result == "accepted")
        {
            await HandleLocationPreciseAcceptedAsync(imei, response);
        }
        else if (response.Result == "error")
        {
            _logger.LogWarning("Received error cmd response type={Type} detail={Detail} from IMEI {Imei}",
                response.Type, response.Detail, imei);
        }
        else
        {
            _logger.LogDebug("Received unhandled cmd response type={Type} result={Result} from IMEI {Imei}",
                response.Type, response.Result, imei);
        }
    }

    private async Task HandleFreqResponseAsync(string imei, CmdResponse response)
    {
        using var scope = _scopeFactory.CreateScope();
        var unitRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUnitRepository>();
        var userRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUserRepository>();

        var unit = await unitRepository.GetByImeiAsync(imei);
        if (unit == null)
        {
            _logger.LogWarning("Received freq response for unknown IMEI {Imei}", imei);
            return;
        }

        unit.PayloadIntervalS = response.PayloadIntervalS;
        unit.GnssRequestIntervalS = response.GnssRequestIntervalS;
        await unitRepository.UpdateAsync(unit);

        _logger.LogInformation(
            "Updated frequency for unit {UnitId} (IMEI {Imei}): payload={PayloadIntervalS}s, gnss={GnssRequestIntervalS}s",
            unit.Id, imei, response.PayloadIntervalS, response.GnssRequestIntervalS);
    }

    private async Task HandleGnssResponseAsync(string imei, CmdResponse response)
    {
        using var scope = _scopeFactory.CreateScope();
        var unitRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUnitRepository>();
        var userRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUserRepository>();

        var unit = await unitRepository.GetByImeiAsync(imei);
        if (unit == null)
        {
            _logger.LogWarning("Received gnss response for unknown IMEI {Imei}", imei);
            return;
        }

        // Parse gnss_enabled from detail field or use null if not present
        bool? gnssEnabled = null;
        if (!string.IsNullOrEmpty(response.Detail))
        {
            gnssEnabled = response.Detail.Equals("enabled", StringComparison.OrdinalIgnoreCase);
        }

        unit.GnssEnabled = gnssEnabled;
        await unitRepository.UpdateAsync(unit);

        _logger.LogInformation(
            "Updated GNSS state for unit {UnitId} (IMEI {Imei}): enabled={GnssEnabled}",
            unit.Id, imei, gnssEnabled);
    }

    private async Task HandleLocationPreciseAcceptedAsync(string imei, CmdResponse response)
    {
        if (string.IsNullOrWhiteSpace(response.RequestId))
        {
            _logger.LogWarning("location.precise accepted response missing request_id for IMEI {Imei}", imei);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var unitRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUnitRepository>();
        var userRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUserRepository>();

        var unit = await unitRepository.GetByImeiAsync(imei);
        if (unit == null)
        {
            _logger.LogWarning("Received location.precise accepted response for unknown IMEI {Imei}", imei);
            return;
        }

        if (!unit.OwnedBy.HasValue)
        {
            _logger.LogWarning("Received location.precise accepted response for unit {UnitId} without owner", unit.Id);
            return;
        }

        var user = await userRepository.GetByIdAsync(unit.OwnedBy.Value);
        if (user == null || string.IsNullOrWhiteSpace(user.IdentityProviderId))
        {
            _logger.LogWarning("Unable to notify location.precise acceptance for unit {UnitId}: owner identity provider ID not found", unit.Id);
            return;
        }

        await _deviceCommandNotifier.NotifyLocationPreciseAcceptedAsync(
            user.IdentityProviderId,
            new LocationPreciseAcceptedNotification
            {
                UnitId = unit.Id,
                Imei = imei,
                RequestId = response.RequestId,
                Detail = response.Detail,
            });

        _logger.LogInformation(
            "Notified clients about accepted location.precise request {RequestId} for unit {UnitId} (IMEI {Imei})",
            response.RequestId, unit.Id, imei);
    }

    private class CmdResponse
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("result")]
        public string? Result { get; set; }

        [JsonPropertyName("detail")]
        public string? Detail { get; set; }

        [JsonPropertyName("request_id")]
        public string? RequestId { get; set; }

        [JsonPropertyName("payload_interval_s")]
        public int? PayloadIntervalS { get; set; }

        [JsonPropertyName("gnss_request_interval_s")]
        public int? GnssRequestIntervalS { get; set; }

        [JsonPropertyName("gnss_enabled")]
        public bool? GnssEnabledFromResponse { get; set; }
    }
}
