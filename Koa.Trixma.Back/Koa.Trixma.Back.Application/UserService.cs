using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface IUserService
{
    Task<User?> GetUserByIdentityProviderIdAsync(string identityProviderId);
    Task<User> EnsureUserExistsAsync(string identityProviderId, string email, string? displayName);
}

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User?> GetUserByIdentityProviderIdAsync(string identityProviderId)
    {
        return await _userRepository.GetByIdentityProviderIdAsync(identityProviderId);
    }

    public async Task<User> EnsureUserExistsAsync(string identityProviderId, string email, string? displayName)
    {
        var user = await _userRepository.GetByIdentityProviderIdAsync(identityProviderId);
        if (user == null)
        {
            user = new User
            {
                IdentityProviderId = identityProviderId,
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }
        else if (user.Email != email || user.DisplayName != displayName)
        {
            user.Email = email;
            user.DisplayName = displayName;
            await _userRepository.UpdateAsync(user);
        }

        return user;
    }
}
