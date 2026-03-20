namespace CoachSubscriptionApi.Entities;

public enum PackageType { ClassPack, MonthlyUnlimited, DropIn }

public class Package
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int ValidityDays { get; set; }
    public int? TotalSessions { get; set; }
    public PackageType Type { get; set; }
    public string? Category { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
