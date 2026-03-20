namespace CoachSubscriptionApi.Entities;

public enum StudentStatus { Active, Inactive, Trial }

public class Student
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ParentName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    public StudentStatus Status { get; set; } = StudentStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<ParentPortalLink> ParentPortalLinks { get; set; } = new List<ParentPortalLink>();
    public ICollection<SessionBooking> SessionBookings { get; set; } = new List<SessionBooking>();
}
