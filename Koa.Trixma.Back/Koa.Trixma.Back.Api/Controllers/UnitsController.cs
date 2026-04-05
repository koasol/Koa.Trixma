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
    
    public UnitsController(ILogger<UnitsController> logger, IUnitService unitService, IUserService userService, IMeasurementService measurementService)
    {
        _logger = logger;
        _unitService = unitService;
        _userService = userService;
        _measurementService = measurementService;
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

        var id = await _unitService.CreateUnitAsync(request.Name, request.MacAddress, request.IpAddress, request.SystemId, request.nfcId);
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

        await _unitService.UpdateUnitAsync(id, request.Name, request.MacAddress, request.IpAddress, request.SystemId, request.nfcId, user.Id);
        return NoContent();
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
