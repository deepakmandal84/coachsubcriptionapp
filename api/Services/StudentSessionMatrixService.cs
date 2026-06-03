using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public static class StudentSessionMatrixService
{
    /// <summary>First month column: June of the current cycle (June–May academy year style).</summary>
    public static DateTime MatrixRangeStartUtc()
    {
        var today = DateTime.UtcNow.Date;
        var year = today.Month >= 6 ? today.Year : today.Year - 1;
        return new DateTime(year, 6, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    public static List<SessionMatrixMonthDto> BuildMonthColumns()
    {
        var start = MatrixRangeStartUtc();
        var end = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var months = new List<SessionMatrixMonthDto>();
        for (var d = start; d <= end; d = d.AddMonths(1))
            months.Add(new SessionMatrixMonthDto(d.Year, d.Month, d.ToString("MMM yyyy")));
        return months;
    }

    public static async Task<StudentSessionMatrixDto> BuildAsync(
        AppDbContext db,
        Guid tenantId,
        string? search,
        CancellationToken ct)
    {
        var months = BuildMonthColumns();
        if (months.Count == 0)
            return new StudentSessionMatrixDto(months, []);

        var rangeStart = MatrixRangeStartUtc();
        var rangeEnd = months[^1];
        var rangeEndExclusive = new DateTime(rangeEnd.Year, rangeEnd.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);

        var studentQuery = db.Students.AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.Status != StudentStatus.Inactive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            studentQuery = studentQuery.Where(s =>
                EF.Functions.ILike(s.Name, term) ||
                (s.Email != null && EF.Functions.ILike(s.Email, term)) ||
                (s.ParentName != null && EF.Functions.ILike(s.ParentName, term)));
        }

        var students = await studentQuery
            .OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name })
            .ToListAsync(ct);

        var counts = await (
            from a in db.Attendances.AsNoTracking()
            join sess in db.Sessions.AsNoTracking() on a.SessionId equals sess.Id
            where a.Present
                  && sess.TenantId == tenantId
                  && sess.Date >= rangeStart
                  && sess.Date < rangeEndExclusive
            group a by new { a.StudentId, sess.Date.Year, sess.Date.Month }
            into g
            select new
            {
                g.Key.StudentId,
                g.Key.Year,
                g.Key.Month,
                Total = g.Sum(x => x.SessionsConsumed),
            }
        ).ToListAsync(ct);

        var lookup = counts.ToDictionary(
            x => (x.StudentId, x.Year, x.Month),
            x => x.Total);

        var rows = students.Select(s =>
        {
            var sessionCounts = months.Select(m =>
                lookup.GetValueOrDefault((s.Id, m.Year, m.Month))).ToList();
            return new StudentSessionMatrixRowDto(s.Id, s.Name, sessionCounts);
        }).ToList();

        return new StudentSessionMatrixDto(months, rows);
    }

    public static async Task<StudentSessionMonthDetailDto?> GetMonthDetailAsync(
        AppDbContext db,
        Guid tenantId,
        Guid studentId,
        int year,
        int month,
        CancellationToken ct)
    {
        if (month is < 1 or > 12) return null;

        var student = await db.Students.AsNoTracking()
            .Where(s => s.Id == studentId && s.TenantId == tenantId)
            .Select(s => new { s.Id, s.Name })
            .FirstOrDefaultAsync(ct);
        if (student == null) return null;

        var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var raw = await (
            from a in db.Attendances.AsNoTracking()
            join sess in db.Sessions.AsNoTracking() on a.SessionId equals sess.Id
            where a.StudentId == studentId
                  && a.Present
                  && sess.TenantId == tenantId
                  && sess.Date >= monthStart
                  && sess.Date < monthEnd
            orderby sess.Date, sess.StartTime
            select new
            {
                sess.Date,
                sess.StartTime,
                sess.Title,
                a.SessionsConsumed,
            }
        ).ToListAsync(ct);

        var entries = raw.Select(x => new StudentSessionAttendanceEntryDto(
            x.Date.ToString("yyyy-MM-dd"),
            FormatSessionTime(x.StartTime),
            string.IsNullOrWhiteSpace(x.Title) ? "Session" : x.Title.Trim(),
            x.SessionsConsumed)).ToList();

        var label = monthStart.ToString("MMM yyyy");
        var total = entries.Sum(e => e.SessionsConsumed);

        return new StudentSessionMonthDetailDto(
            student.Id,
            student.Name,
            year,
            month,
            label,
            total,
            entries);
    }

    static string? FormatSessionTime(TimeSpan time)
    {
        if (time == TimeSpan.Zero) return null;
        var dt = DateTime.Today.Add(time);
        return dt.ToString("h:mm tt");
    }
}
