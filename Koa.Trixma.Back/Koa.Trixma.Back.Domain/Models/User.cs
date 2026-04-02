using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public class User
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string IdentityProviderId { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
