namespace CoachSubscriptionApi.Entities;

public class SessionBooking
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
    public Student Student { get; set; } = null!;
}
