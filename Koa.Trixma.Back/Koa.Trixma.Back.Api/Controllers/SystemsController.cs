using Koa.Trixma.Back.Api.Models;
using Koa.Trixma.Back.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace Koa.Trixma.Back.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class SystemsController : ControllerBase
{
    private readonly ILogger<SystemsController> _logger;
    private readonly ISystemService _systemService;
    private readonly IUserService _userService;
    private readonly IUnitService _unitService;
    private readonly IMeasurementService _measurementService;
    
    public SystemsController(ILogger<SystemsController> logger, ISystemService systemService, IUserService userService, IUnitService unitService, IMeasurementService measurementService)
    {
        _logger = logger;
        _systemService = systemService;
        _userService = userService;
        _unitService = unitService;
        _measurementService = measurementService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Koa.Trixma.Back.Domain.Models.System>>> GetAll()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var systems = await _systemService.GetAllSystemsAsync(user.Id);
        return Ok(systems);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Koa.Trixma.Back.Domain.Models.System>> GetById(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var system = await _systemService.GetSystemByIdAsync(id, user.Id);
        if (system == null)
        {
            return NotFound();
        }
        return Ok(system);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] SystemCreateRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        var user = await GetCurrentUserAsync();
        if (user == null)
        {
            return BadRequest("User record not found. Please sync user first.");
        }

        var id = await _systemService.CreateSystemAsync(request.Name, request.Description, user.Id);
        return Ok(id);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SystemUpdateRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var existing = await _systemService.GetSystemByIdAsync(id, user.Id);
        if (existing == null)
        {
            return NotFound();
        }
        await _systemService.UpdateSystemAsync(id, request.Name, request.Description, user.Id);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var existing = await _systemService.GetSystemByIdAsync(id, user.Id);
        if (existing == null)
        {
            return NotFound();
        }
        await _systemService.DeleteSystemAsync(id, user.Id);
        return NoContent();
    }

    [HttpGet("{systemId}/units")]
    public async Task<IActionResult> GetUnits(Guid systemId)
    {
        Log.Information("Getting units for system {SystemId}", systemId);
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var system = await _systemService.GetSystemByIdAsync(systemId, user.Id);
        if (system == null)
        {
            return NotFound();
        }

        var units = await _unitService.GetUnitsBySystemIdAsync(systemId);
        return Ok(units);
    }

    [HttpGet("{id}/measurements")]
    public async Task<ActionResult<IDictionary<string, IEnumerable<MeasurementPoint>>>> GetMeasurements(Guid id, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var measurements = await _measurementService.GetBySystemIdAsync(id, from, to, user.Id);
        return Ok(measurements);
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
