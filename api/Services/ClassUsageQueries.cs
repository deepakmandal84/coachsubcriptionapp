using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public static class ClassUsageQueries
{
    public static async Task<ClassUsageSummaryDto> GetSummaryAsync(
        AppDbContext db,
        Guid tenantId,
        Guid studentId,
        Guid? preferredSubscriptionId,
        CancellationToken ct)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var monthlyTaken = await (
            from a in db.Attendances.AsNoTracking()
            join s in db.Sessions.AsNoTracking() on a.SessionId equals s.Id
            where a.StudentId == studentId && a.Present && s.TenantId == tenantId && s.Date >= monthStart && s.Date < monthEnd
            select (int?)a.SessionsConsumed
        ).SumAsync(ct) ?? 0;

        Subscription? sub = null;
        if (preferredSubscriptionId.HasValue)
        {
            sub = await db.Subscriptions.AsNoTracking()
                .Include(x => x.Package)
                .FirstOrDefaultAsync(x => x.Id == preferredSubscriptionId.Value && x.StudentId == studentId && x.TenantId == tenantId, ct);
        }
        sub ??= await db.Subscriptions.AsNoTracking()
            .Include(x => x.Package)
            .Where(x => x.TenantId == tenantId && x.StudentId == studentId && x.Status == SubscriptionStatus.Active)
            .OrderByDescending(x => x.StartDate)
            .FirstOrDefaultAsync(ct);

        if (sub?.Package == null)
            return new ClassUsageSummaryDto(monthlyTaken, null, null, false, null, null);

        var isUnlimited = sub.Package.Type == PackageType.MonthlyUnlimited;
        return new ClassUsageSummaryDto(
            monthlyTaken,
            sub.RemainingSessions,
            sub.Package.TotalSessions,
            isUnlimited,
            sub.Package.Name,
            sub.Package.Type.ToString());
    }
}
