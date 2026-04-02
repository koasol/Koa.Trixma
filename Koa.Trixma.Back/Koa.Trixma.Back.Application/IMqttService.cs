namespace Koa.Trixma.Back.Application;

public interface IMqttService
{
    Task ConnectAsync();
    Task PublishAsync(string topic, string payload, bool retain = false);
    Task SubscribeAsync(string topicFilter, Func<string, string, Task> onMessage);
    Task SendCommandAsync(string deviceId, string commandJson);
    bool IsConnected { get; }
}
