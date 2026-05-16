using Koa.Trixma.Back.Application;
using Koa.Trixma.Back.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace Koa.Trixma.Back.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class UnitsController : ControllerBase
{
    private readonly ILogger<UnitsController> _logger;
    private readonly IUnitService _unitService;
    private readonly IUserService _userService;
    private readonly IMeasurementService _measurementService;
    private readonly IMqttService _mqttService;

    public UnitsController(ILogger<UnitsController> logger, IUnitService unitService, IUserService userService, IMeasurementService measurementService, IMqttService mqttService)
    {
        _logger = logger;
        _unitService = unitService;
        _userService = userService;
        _measurementService = measurementService;
        _mqttService = mqttService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Koa.Trixma.Back.Domain.Models.Unit>>> GetAll()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var units = await _unitService.GetAllUnitsAsync(user.Id);
        return Ok(units);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Koa.Trixma.Back.Domain.Models.Unit>> GetById(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null)
        {
            return NotFound();
        }
        return Ok(unit);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] UnitCreateRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var id = await _unitService.CreateUnitAsync(request.Name, request.MacAddress, request.IpAddress, request.SystemId, request.nfcId, request.Imei, user.Id);
        return Ok(id);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UnitUpdateRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var existing = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (existing == null)
        {
            return NotFound();
        }

        await _unitService.UpdateUnitAsync(id, request.Name, request.MacAddress, request.IpAddress, request.SystemId, request.nfcId, request.Imei, user.Id);
        return NoContent();
    }

    [HttpGet("provisioning")]
    public async Task<IActionResult> GetProvisioningStatus([FromQuery] string imei)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(imei))
        {
            return BadRequest("IMEI is required");
        }

        var status = await _unitService.GetProvisioningStatusAsync(imei, user.Id);
        return Ok(status);
    }

    [HttpPost("provisioning")]
    public async Task<IActionResult> Provision([FromBody] UnitProvisioningRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        if (string.IsNullOrWhiteSpace(request.Imei))
        {
            return BadRequest("IMEI is required");
        }

        try
        {
            var unit = await _unitService.ProvisionUnitAsync(request.Imei, user.Id, request.SystemId);
            return Ok(unit);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var existing = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (existing == null)
        {
            return NotFound();
        }

        await _unitService.DeleteUnitAsync(id, user.Id);
        return NoContent();
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<Guid>> Register([FromBody] UnitRegisterRequest request)
    {
        Log.Information("Registering unit: {UnitName}", request?.Name);
        if (request == null)
        {
            Log.Warning("Register request body is null");
            return BadRequest("Request body is required");
        }
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        var ip = forwardedFor?.Split(',')[0].Trim();
        if (string.IsNullOrWhiteSpace(ip))
        {
            ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        }

        var id = await _unitService.RegisterUnitAsync(request.Name, request.MacAddress, ip);
        return Ok(id);
    }

    [HttpPost("measurements/report")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportMeasurements([FromBody] MeasurementReportRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }
        if (string.IsNullOrWhiteSpace(request.DeviceId))
        {
            return BadRequest("DeviceId is required");
        }
        if (request.Measurements == null || request.Measurements.Count == 0)
        {
            return BadRequest("At least one measurement is required");
        }

        var success = await _measurementService.IngestAsync(
            request.DeviceId,
            request.Measurements.Select(m => (m.Type, m.Value, m.Timestamp))
        );

        if (!success)
        {
            return NotFound("Unit not found or no valid measurements");
        }

        return Ok();
    }

    [HttpGet("{id}/measurements")]
    public async Task<ActionResult<IEnumerable<MeasurementGroup>>> GetMeasurements(Guid id, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var result = await _measurementService.GetByUnitIdAsync(id, from, to, user.Id);
        if (result == null) return NotFound();

        return Ok(result);
    }

    [HttpPost("{id}/ping")]
    public async Task<IActionResult> Ping(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null)
        {
            return NotFound("Unit not found");
        }

        if (string.IsNullOrWhiteSpace(unit.Imei))
        {
            return BadRequest("Unit does not have an IMEI");
        }

        var topic = $"trixma/devices/{unit.Imei}/cmd";
        var payload = "{\"cmd\":\"ping\"}";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation("Ping sent to unit {UnitId} on topic {Topic}", id, topic);
            return Ok(new { message = "Ping sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send ping to unit {UnitId}", id);
            return StatusCode(500, "Failed to send ping");
        }
    }

    [HttpPost("{id}/freq-query")]
    public async Task<IActionResult> QueryFrequency(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null) return NotFound("Unit not found");

        if (string.IsNullOrWhiteSpace(unit.Imei))
            return BadRequest("Unit does not have an IMEI");

        var topic = $"trixma/devices/{unit.Imei}/cmd";
        var payload = "{\"cmd\":\"freq.get\"}";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation("freq.get sent to unit {UnitId} on topic {Topic}", id, topic);
            return Ok(new { message = "Frequency query sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send freq.get to unit {UnitId}", id);
            return StatusCode(500, "Failed to send frequency query");
        }
    }

    [HttpPost("{id}/freq-set")]
    public async Task<IActionResult> SetFrequency(Guid id, [FromBody] FreqSetRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null) return NotFound("Unit not found");

        if (string.IsNullOrWhiteSpace(unit.Imei))
            return BadRequest("Unit does not have an IMEI");

        if (request == null || (request.PayloadIntervalS == null && request.GnssRequestIntervalS == null))
            return BadRequest("At least one frequency parameter (payloadIntervalS or gnssRequestIntervalS) is required");

        using var jsonDoc = System.Text.Json.JsonDocument.Parse("{}");
        var options = System.Text.Json.JsonSerializerOptions.Default;
        var cmd = new { cmd = "freq.set" };
        var cmdJson = System.Text.Json.JsonSerializer.Serialize(cmd, options);

        // Build payload with provided parameters
        var payload = System.Text.Json.JsonSerializer.Serialize(
            new Dictionary<string, object?>
            {
                { "cmd", "freq.set" },
                { "payload_interval_s", request.PayloadIntervalS },
                { "gnss_request_interval_s", request.GnssRequestIntervalS }
            },
            new System.Text.Json.JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull }
        );

        var topic = $"trixma/devices/{unit.Imei}/cmd";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation("freq.set sent to unit {UnitId} on topic {Topic} with payload: {Payload}", id, topic, payload);
            return Ok(new { message = "Frequency setting sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send freq.set to unit {UnitId}", id);
            return StatusCode(500, "Failed to send frequency setting");
        }
    }

    [HttpPost("{id}/gnss-set")]
    public async Task<IActionResult> SetGnss(Guid id, [FromBody] GnssConfigRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null) return NotFound("Unit not found");

        if (string.IsNullOrWhiteSpace(unit.Imei))
            return BadRequest("Unit does not have an IMEI");

        if (request == null)
            return BadRequest("Request body is required");

        var payload = System.Text.Json.JsonSerializer.Serialize(
            new
            {
                cmd = "gnss.set",
                enabled = request.Enabled
            }
        );

        var topic = $"trixma/devices/{unit.Imei}/cmd";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation("gnss.set sent to unit {UnitId} on topic {Topic} with enabled={Enabled}", id, topic, request.Enabled);
            return Ok(new { message = "GNSS setting sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send gnss.set to unit {UnitId}", id);
            return StatusCode(500, "Failed to send GNSS setting");
        }
    }

    [HttpPost("{id}/lte-set")]
    public async Task<IActionResult> SetLte(Guid id, [FromBody] LteConfigRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null) return NotFound("Unit not found");

        if (string.IsNullOrWhiteSpace(unit.Imei))
            return BadRequest("Unit does not have an IMEI");

        if (request == null)
            return BadRequest("Request body is required");

        var payload = System.Text.Json.JsonSerializer.Serialize(
            new
            {
                cmd = "lte.set",
                enabled = request.Enabled
            }
        );

        var topic = $"trixma/devices/{unit.Imei}/cmd";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation("lte.set sent to unit {UnitId} on topic {Topic} with enabled={Enabled}", id, topic, request.Enabled);
            return Ok(new { message = "LTE setting sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send lte.set to unit {UnitId}", id);
            return StatusCode(500, "Failed to send LTE setting");
        }
    }

    [HttpPost("{id}/location-precise-request")]
    public async Task<IActionResult> RequestPreciseLocation(Guid id, [FromBody] LocationPreciseRequestCommand? request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var unit = await _unitService.GetUnitByIdAsync(id, user.Id);
        if (unit == null) return NotFound("Unit not found");

        if (string.IsNullOrWhiteSpace(unit.Imei))
            return BadRequest("Unit does not have an IMEI");

        var command = request ?? new LocationPreciseRequestCommand();
        if (command.MaxWaitS <= 0 || command.MinAccCm <= 0)
            return BadRequest("maxWaitS and minAccCm must be greater than 0");

        var requestId = string.IsNullOrWhiteSpace(command.RequestId)
            ? $"gnss-req-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}"
            : command.RequestId.Trim();

        var payload = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["type"] = "location.precise.request",
            ["request_id"] = requestId,
            ["max_wait_s"] = command.MaxWaitS,
            ["min_acc_cm"] = command.MinAccCm,
        });

        var topic = $"trixma/devices/{unit.Imei}/cmd";

        try
        {
            await _mqttService.PublishAsync(topic, payload);
            _logger.LogInformation(
                "location.precise.request sent to unit {UnitId} (IMEI {Imei}) with request_id {RequestId}",
                unit.Id, unit.Imei, requestId);

            return Ok(new { message = "Location request sent", requestId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send location.precise.request to unit {UnitId}", id);
            return StatusCode(500, "Failed to send location request");
        }
    }

    private async Task<Koa.Trixma.Back.Domain.Models.User?> GetCurrentUserAsync()
    {
        var identityProviderId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(identityProviderId))
        {
            return null;
        }

        return await _userService.GetUserByIdentityProviderIdAsync(identityProviderId);
    }
}
