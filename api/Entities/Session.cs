namespace CoachSubscriptionApi.Entities;

public enum SessionType { Group, Private }

public class Session
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public SessionType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<SessionBooking> Bookings { get; set; } = new List<SessionBooking>();
}

public class Attendance
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public bool Present { get; set; }
    public int SessionsConsumed { get; set; } = 1;
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
    public Student Student { get; set; } = null!;
}
