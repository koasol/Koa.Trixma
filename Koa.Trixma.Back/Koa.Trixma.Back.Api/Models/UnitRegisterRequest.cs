namespace Koa.Trixma.Back.Api.Models;

public class UnitRegisterRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
}
