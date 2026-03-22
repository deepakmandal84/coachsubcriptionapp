namespace CoachSubscriptionApi.Entities;

public class SessionCoach
{
    public Guid SessionId { get; set; }
    public Guid CoachId { get; set; }

    public Session Session { get; set; } = null!;
    public Coach Coach { get; set; } = null!;
}
