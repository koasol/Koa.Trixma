using System.ComponentModel.DataAnnotations;

namespace Koa.Trixma.Back.Domain.Models;

public class Unit
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }

    public Guid? SystemId { get; set; }
    public string? nfcId { get; set; }
    
    public DateTime? LastProvisionedAt { get; set; }

    public ICollection<Measurement> Measurements { get; set; } = new List<Measurement>();
}
