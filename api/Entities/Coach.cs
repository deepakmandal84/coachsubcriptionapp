namespace CoachSubscriptionApi.Entities;

public enum Role { Coach, Admin }

public class Coach
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Role Role { get; set; } = Role.Coach;
    public string? AcademyName { get; set; }
    public string? AcademyType { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    /// <summary>Secret token for public class schedule / booking link (no auth).</summary>
    public string? ScheduleShareToken { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Package> Packages { get; set; } = new List<Package>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
