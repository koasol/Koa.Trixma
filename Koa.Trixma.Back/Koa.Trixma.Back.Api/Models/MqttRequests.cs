namespace Koa.Trixma.Back.Api.Models;

public class PublishRequest
{
    public string Topic { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public bool Retain { get; set; } = false;
}

public class CommandRequest
{
    public string Command { get; set; } = string.Empty;
    public object? Payload { get; set; }
}

public class FreqSetRequest
{
    public int? PayloadIntervalS { get; set; }
    public int? GnssRequestIntervalS { get; set; }
}

public class GnssConfigRequest
{
    public bool Enabled { get; set; }
}
