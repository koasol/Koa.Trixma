using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public class System
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public Guid OwnedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Unit> Units { get; set; } = new List<Unit>();
}
