using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public static class SessionPrivateClientHelper
{
    public const string PersonalTrainingPrefix = "Personal Training";

    public static bool IsPrivate(SessionType type) => type == SessionType.Private;

    public static string BuildDefaultTitle(string studentName) =>
        $"{PersonalTrainingPrefix} — {studentName.Trim()}";

    public static string ResolveTitle(string? requestedTitle, string studentName)
    {
        var trimmed = requestedTitle?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return BuildDefaultTitle(studentName);
        return trimmed;
    }

    public static async Task<Student?> GetActiveStudentAsync(
        AppDbContext db,
        Guid tenantId,
        Guid studentId,
        CancellationToken ct) =>
        await db.Students.AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.Id == studentId && s.TenantId == tenantId && s.Status != StudentStatus.Inactive,
                ct);

    /// <summary>
    /// Group sessions are visible to everyone; private (PT) only to the student booked on that session.
    /// Pass null student id to hide all PT sessions (e.g. anonymous public schedule).
    /// </summary>
    public static IQueryable<Session> ApplyClientVisibilityFilter(IQueryable<Session> query, Guid? viewerStudentId) =>
        viewerStudentId.HasValue
            ? query.Where(s =>
                s.Type != SessionType.Private ||
                s.Bookings.Any(b => b.StudentId == viewerStudentId.Value))
            : query.Where(s => s.Type != SessionType.Private);

    /// <summary>Clients may self-book group sessions only; PT is assigned by the coach.</summary>
    public static bool CanClientSelfBook(Session session) => !IsPrivate(session.Type);

    public static async Task EnsureBookingAsync(
        AppDbContext db,
        Guid tenantId,
        Guid sessionId,
        Guid studentId,
        CancellationToken ct)
    {
        var exists = await db.SessionBookings.AnyAsync(
            b => b.SessionId == sessionId && b.StudentId == studentId,
            ct);
        if (exists) return;

        db.SessionBookings.Add(new SessionBooking
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SessionId = sessionId,
            StudentId = studentId,
            CreatedAt = DateTime.UtcNow,
        });
    }

    /// <summary>PT sessions have one client: replace other bookings and ensure the selected student is booked.</summary>
    public static async Task<string> AssignPrivateClientAsync(
        AppDbContext db,
        Guid tenantId,
        Guid sessionId,
        Guid studentId,
        string? requestedTitle,
        CancellationToken ct)
    {
        var student = await GetActiveStudentAsync(db, tenantId, studentId, ct)
            ?? throw new InvalidOperationException("Client not found.");

        var stale = await db.SessionBookings
            .Where(b => b.SessionId == sessionId && b.StudentId != studentId)
            .ToListAsync(ct);
        if (stale.Count > 0)
            db.SessionBookings.RemoveRange(stale);

        await EnsureBookingAsync(db, tenantId, sessionId, studentId, ct);
        return ResolveTitle(requestedTitle, student.Name);
    }
}
