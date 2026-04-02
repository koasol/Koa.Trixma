using System.Security.Claims;
using Koa.Trixma.Back.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Koa.Trixma.Back.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncUser()
    {
        var identityProviderId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var name = User.FindFirst("name")?.Value ?? User.FindFirst(ClaimTypes.Name)?.Value;

        if (string.IsNullOrEmpty(identityProviderId) || string.IsNullOrEmpty(email))
        {
            return BadRequest("Invalid token: Missing UID or Email");
        }

        var user = await _userService.EnsureUserExistsAsync(identityProviderId, email, name);
        return Ok(user);
    }
}
