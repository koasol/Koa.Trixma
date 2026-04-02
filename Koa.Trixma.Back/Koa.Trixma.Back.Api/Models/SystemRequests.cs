namespace Koa.Trixma.Back.Api.Models;

public class SystemCreateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class SystemUpdateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
