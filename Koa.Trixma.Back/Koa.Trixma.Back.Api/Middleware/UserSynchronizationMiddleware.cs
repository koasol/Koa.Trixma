using System.Security.Claims;
using Koa.Trixma.Back.Application;

namespace Koa.Trixma.Back.Api.Middleware;

public class UserSynchronizationMiddleware
{
    private readonly RequestDelegate _next;

    public UserSynchronizationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IUserService userService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var identityProviderId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = context.User.FindFirst(ClaimTypes.Email)?.Value;
            var name = context.User.FindFirst("name")?.Value ?? context.User.FindFirst(ClaimTypes.Name)?.Value;

            if (!string.IsNullOrEmpty(identityProviderId) && !string.IsNullOrEmpty(email))
            {
                // Ensure the user exists in the local database
                // This will create the user on their first request after login
                await userService.EnsureUserExistsAsync(identityProviderId, email, name);
            }
        }

        await _next(context);
    }
}

public static class UserSynchronizationMiddlewareExtensions
{
    public static IApplicationBuilder UseUserSynchronization(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<UserSynchronizationMiddleware>();
    }
}
