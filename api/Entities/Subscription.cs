namespace CoachSubscriptionApi.Entities;

public enum SubscriptionStatus { Active, Expired, Cancelled }
public enum PaymentStatus { Paid, Due }
public enum PaymentMethod { Cash, Zelle, Venmo, Card }

public class Subscription
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Guid PackageId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int? RemainingSessions { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Due;
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<ParentPortalLink> ParentPortalLinks { get; set; } = new List<ParentPortalLink>();
}

public class Payment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Subscription Subscription { get; set; } = null!;
}
