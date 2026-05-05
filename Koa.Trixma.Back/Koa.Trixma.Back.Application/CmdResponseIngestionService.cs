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
    private readonly ILogger<CmdResponseIngestionService> _logger;

    public CmdResponseIngestionService(
        IMqttService mqttService,
        IServiceScopeFactory scopeFactory,
        ILogger<CmdResponseIngestionService> logger)
    {
        _mqttService = mqttService;
        _scopeFactory = scopeFactory;
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

        FreqResponse? response;
        try
        {
            response = JsonSerializer.Deserialize<FreqResponse>(payload, new JsonSerializerOptions
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
        else
        {
            _logger.LogDebug("Received unhandled cmd response type={Type} result={Result} from IMEI {Imei}",
                response.Type, response.Result, imei);
        }
    }

    private async Task HandleFreqResponseAsync(string imei, FreqResponse response)
    {
        using var scope = _scopeFactory.CreateScope();
        var unitRepository = scope.ServiceProvider.GetRequiredService<Data.Repositories.IUnitRepository>();

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

    private class FreqResponse
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("result")]
        public string? Result { get; set; }

        [JsonPropertyName("payload_interval_s")]
        public int? PayloadIntervalS { get; set; }

        [JsonPropertyName("gnss_request_interval_s")]
        public int? GnssRequestIntervalS { get; set; }
    }
}
