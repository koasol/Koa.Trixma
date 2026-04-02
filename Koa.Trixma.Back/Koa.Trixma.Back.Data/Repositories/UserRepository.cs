using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdentityProviderIdAsync(string identityProviderId);
    Task<User?> GetByIdAsync(Guid id);
    Task<Guid> CreateAsync(User user);
    Task UpdateAsync(User user);
}

public class UserRepository : IUserRepository
{
    private readonly TrixmaDbContext _context;

    public UserRepository(TrixmaDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdentityProviderIdAsync(string identityProviderId)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.IdentityProviderId == identityProviderId);
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users.FindAsync(id);
    }

    public async Task<Guid> CreateAsync(User user)
    {
        if (user.Id == Guid.Empty)
        {
            user.Id = Guid.NewGuid();
        }
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
        return user.Id;
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }
}
