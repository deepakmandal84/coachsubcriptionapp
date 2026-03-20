namespace CoachSubscriptionApi.Entities;

public class ParentPortalLink
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime TokenExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Subscription? Subscription { get; set; }
}
