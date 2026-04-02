using System.Text.Json;
using Koa.Trixma.Back.Api.Models;
using Koa.Trixma.Back.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Koa.Trixma.Back.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class MqttController : ControllerBase
{
    private readonly IMqttService _mqttService;

    public MqttController(IMqttService mqttService)
    {
        _mqttService = mqttService;
    }

    [HttpPost("publish")]
    public async Task<IActionResult> Publish([FromBody] PublishRequest request)
    {
        if (request == null)
            return BadRequest("Request body is required");
        if (string.IsNullOrWhiteSpace(request.Topic))
            return BadRequest("Topic is required");

        await _mqttService.PublishAsync(request.Topic, request.Payload ?? string.Empty, request.Retain);
        return Ok();
    }

    [HttpPost("devices/{deviceId}/command")]
    public async Task<IActionResult> SendCommand(string deviceId, [FromBody] CommandRequest request)
    {
        if (request == null)
            return BadRequest("Request body is required");
        if (string.IsNullOrWhiteSpace(request.Command))
            return BadRequest("Command is required");
        if (string.IsNullOrWhiteSpace(deviceId))
            return BadRequest("DeviceId is required");

        var commandJson = JsonSerializer.Serialize(request, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await _mqttService.SendCommandAsync(deviceId, commandJson);
        return Ok();
    }
}
