using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public static class SessionRosterService
{
    public static async Task<List<Guid>> ValidateActiveStudentIdsAsync(
        AppDbContext db,
        Guid tenantId,
        IEnumerable<Guid> studentIds,
        CancellationToken ct)
    {
        var distinct = studentIds.Distinct().ToList();
        if (distinct.Count == 0) return [];

        var found = await db.Students.AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.Status != StudentStatus.Inactive && distinct.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(ct);

        if (found.Count != distinct.Count)
            throw new InvalidOperationException("One or more clients were not found on the active roster.");

        return distinct;
    }

    public static async Task BookStudentsAsync(
        AppDbContext db,
        Guid tenantId,
        Guid sessionId,
        IEnumerable<Guid> studentIds,
        CancellationToken ct)
    {
        foreach (var studentId in studentIds.Distinct())
            await SessionPrivateClientHelper.EnsureBookingAsync(db, tenantId, sessionId, studentId, ct);
    }

    public static async Task SyncGroupBookingsAsync(
        AppDbContext db,
        Guid tenantId,
        Guid sessionId,
        IReadOnlyList<Guid> studentIds,
        CancellationToken ct)
    {
        var target = studentIds.Distinct().ToHashSet();
        var existing = await db.SessionBookings
            .Where(b => b.SessionId == sessionId)
            .ToListAsync(ct);

        foreach (var booking in existing)
        {
            if (!target.Contains(booking.StudentId))
                db.SessionBookings.Remove(booking);
        }

        await BookStudentsAsync(db, tenantId, sessionId, target, ct);
    }
}
