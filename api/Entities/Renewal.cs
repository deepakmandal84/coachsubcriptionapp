namespace CoachSubscriptionApi.Entities;

public enum RenewalRequestStatus
{
    Pending = 0,
    Confirmed = 1
}

public class RenewalRequest
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public RenewalRequestStatus Status { get; set; } = RenewalRequestStatus.Pending;
    public DateTime RequestedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Subscription? Subscription { get; set; }
}

public class RenewalTransaction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid RenewalRequestId { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime ConfirmedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Subscription? Subscription { get; set; }
    public RenewalRequest RenewalRequest { get; set; } = null!;
}

