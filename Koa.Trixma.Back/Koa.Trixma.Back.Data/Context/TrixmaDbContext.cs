using Koa.Trixma.Back.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Koa.Trixma.Back.Data.Context;

public class TrixmaDbContext : DbContext
{
    public TrixmaDbContext(DbContextOptions options) : base(options)
    {
        
    }
    
    public DbSet<Unit> Units{ get; set; }
    public DbSet<Measurement> Measurements { get; set; }
    public DbSet<Koa.Trixma.Back.Domain.Models.System> Systems { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Measurement>()
            .HasKey(m => new { m.Id, m.Timestamp });
    }
}
