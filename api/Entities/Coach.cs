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

    /// <summary>Friendly URL segment for public schedule: /{slug}/info (lowercase, unique).</summary>
    public string? ScheduleShareSlug { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>When set, this coach is staff for the club whose owner id is <see cref="ClubTenantId"/>.</summary>
    public Guid? ClubTenantId { get; set; }
    public Coach? ClubOwner { get; set; }

    /// <summary>Staff only: create/edit/delete sessions. Club owner always has this implicitly.</summary>
    public bool CanCreateSessions { get; set; } = true;

    /// <summary>Staff only: create/update/delete students. Club owner always has this implicitly. Viewing roster for attendance is allowed regardless.</summary>
    public bool CanManageStudents { get; set; } = true;

    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Package> Packages { get; set; } = new List<Package>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
