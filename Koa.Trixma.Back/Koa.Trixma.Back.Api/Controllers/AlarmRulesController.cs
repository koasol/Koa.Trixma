using Koa.Trixma.Back.Application;
using Koa.Trixma.Back.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Koa.Trixma.Back.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class AlarmRulesController : ControllerBase
{
    private readonly ILogger<AlarmRulesController> _logger;
    private readonly IAlarmRuleService _alarmRuleService;
    private readonly IUserService _userService;

    public AlarmRulesController(ILogger<AlarmRulesController> logger, IAlarmRuleService alarmRuleService, IUserService userService)
    {
        _logger = logger;
        _alarmRuleService = alarmRuleService;
        _userService = userService;
    }

    [HttpGet("unit/{unitId}")]
    public async Task<IActionResult> GetByUnitId(Guid unitId)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var rules = await _alarmRuleService.GetByUnitIdAsync(unitId);
        return Ok(rules);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var rule = await _alarmRuleService.GetByIdAsync(id);
        if (rule == null) return NotFound();

        return Ok(rule);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAlarmRuleRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var id = await _alarmRuleService.CreateAsync(
            request.UnitId,
            request.Name,
            request.MeasurementType,
            request.Condition,
            request.Threshold,
            request.CooldownMinutes);

        _logger.LogInformation("Alarm rule {RuleId} created by user {UserId} for unit {UnitId}", id, user.Id, request.UnitId);
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAlarmRuleRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var updated = await _alarmRuleService.UpdateAsync(
            id,
            request.Name,
            request.MeasurementType,
            request.Condition,
            request.Threshold,
            request.CooldownMinutes,
            request.Enabled);

        if (!updated) return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var deleted = await _alarmRuleService.DeleteAsync(id);
        if (!deleted) return NotFound();

        return NoContent();
    }

    [HttpGet("{id}/events")]
    public async Task<IActionResult> GetEvents(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var events = await _alarmRuleService.GetEventsAsync(id);
        return Ok(events);
    }

    private async Task<Koa.Trixma.Back.Domain.Models.User?> GetCurrentUserAsync()
    {
        var identityProviderId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(identityProviderId)) return null;
        return await _userService.GetUserByIdentityProviderIdAsync(identityProviderId);
    }
}
