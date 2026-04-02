using MQTTnet;
using MQTTnet.Client;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

public class MqttSettings
{
    // Example: wss://mqtt.m73.app/mqtt-tcp
    public string? WebSocketServer { get; set; }
    // If using TCP instead of WebSockets
    public string? Host { get; set; }
    public int? Port { get; set; }
    public bool UseTls { get; set; } = true;

    public string? ClientId { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public class MqttService : IMqttService, IAsyncDisposable
{
    private readonly MqttSettings _settings;
    private readonly IMqttClient _client;
    private readonly ILogger<MqttService> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly List<(string Filter, Func<string, string, Task> Handler)> _subscriptions = new();

    public MqttService(MqttSettings settings, ILogger<MqttService> logger)
    {
        _settings = settings;
        _logger = logger;
        _client = new MqttFactory().CreateMqttClient();
        _client.ApplicationMessageReceivedAsync += DispatchMessageAsync;
    }

    public bool IsConnected => _client.IsConnected;

    public async Task ConnectAsync()
    {
        await EnsureConnectedAsync();
    }

    public async Task PublishAsync(string topic, string payload, bool retain = false)
    {
        if (string.IsNullOrWhiteSpace(topic)) throw new ArgumentException("Topic is required", nameof(topic));
        await EnsureConnectedAsync();

        var message = new MqttApplicationMessageBuilder()
            .WithTopic(topic)
            .WithPayload(payload ?? string.Empty)
            .WithRetainFlag(retain)
            .Build();

        await _client.PublishAsync(message);
    }

    public async Task SubscribeAsync(string topicFilter, Func<string, string, Task> onMessage)
    {
        if (string.IsNullOrWhiteSpace(topicFilter)) throw new ArgumentException("Topic filter is required", nameof(topicFilter));
        _subscriptions.Add((topicFilter, onMessage));
        await EnsureConnectedAsync();
        await _client.SubscribeAsync(new MqttClientSubscribeOptionsBuilder()
            .WithTopicFilter(topicFilter)
            .Build());
        _logger.LogInformation("Subscribed to MQTT topic filter: {TopicFilter}", topicFilter);
    }

    public Task SendCommandAsync(string deviceId, string commandJson)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) throw new ArgumentException("DeviceId is required", nameof(deviceId));
        return PublishAsync($"trixma/devices/{deviceId}/commands", commandJson);
    }

    private async Task DispatchMessageAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        var topic = e.ApplicationMessage.Topic;
        var payload = e.ApplicationMessage.ConvertPayloadToString() ?? string.Empty;

        foreach (var (filter, handler) in _subscriptions)
        {
            if (TopicMatchesFilter(topic, filter))
            {
                try { await handler(topic, payload); }
                catch (Exception ex) { _logger.LogError(ex, "Error handling MQTT message on topic {Topic}", topic); }
            }
        }
    }

    private static bool TopicMatchesFilter(string topic, string filter)
    {
        var topicParts = topic.Split('/');
        var filterParts = filter.Split('/');

        if (filterParts[^1] == "#")
            return topicParts.Length >= filterParts.Length - 1 &&
                   topicParts.Take(filterParts.Length - 1).SequenceEqual(filterParts.Take(filterParts.Length - 1));

        if (topicParts.Length != filterParts.Length) return false;

        return !filterParts.Where((part, i) => part != "+" && part != topicParts[i]).Any();
    }

    private async Task EnsureConnectedAsync()
    {
        if (_client.IsConnected) return;

        await _gate.WaitAsync();
        try
        {
            if (_client.IsConnected) return;

            var builder = new MqttClientOptionsBuilder();

            if (!string.IsNullOrWhiteSpace(_settings.WebSocketServer))
            {
                // Expecting something like wss://mqtt.m73.app/mqtt-tcp or ws://host:port/mqtt
                builder.WithWebSocketServer(_settings.WebSocketServer);
            }
            else if (!string.IsNullOrWhiteSpace(_settings.Host))
            {
                if (_settings.Port.HasValue)
                {
                    builder.WithTcpServer(_settings.Host, _settings.Port.Value);
                }
                else
                {
                    builder.WithTcpServer(_settings.Host);
                }

                if (_settings.UseTls)
                {
                    builder.WithTls();
                }
            }
            else
            {
                throw new InvalidOperationException("MQTT settings are not configured. Please set WebSocketServer or Host/Port.");
            }

            if (!string.IsNullOrWhiteSpace(_settings.ClientId))
            {
                builder.WithClientId(_settings.ClientId);
            }

            if (!string.IsNullOrWhiteSpace(_settings.Username))
            {
                builder.WithCredentials(_settings.Username, _settings.Password);
            }

            var options = builder.Build();
            _logger.LogInformation("Connecting to MQTT broker...");
            await _client.ConnectAsync(options);
            _logger.LogInformation("Successfully connected to MQTT broker");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to MQTT broker");
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        try { await _client.DisconnectAsync(); } catch { /* ignore */ }
        _gate.Dispose();
    }
}
