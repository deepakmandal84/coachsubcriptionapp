using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public ReportsController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard(CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var tenantId = _tenant.TenantId.Value;
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var studentCount = await _db.Students.CountAsync(ct);
        var activeSubs = await _db.Subscriptions.CountAsync(s => s.Status == Entities.SubscriptionStatus.Active, ct);
        var paymentsDue = await _db.Subscriptions.CountAsync(s => s.Status == Entities.SubscriptionStatus.Active && s.PaymentStatus == Entities.PaymentStatus.Due, ct);
        var monthRevenue = await _db.Payments.Where(p => p.PaidAt >= startOfMonth).SumAsync(p => p.Amount, ct);
        var expiringSoon = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Package)
            .Where(s => s.Status == Entities.SubscriptionStatus.Active && s.ExpiryDate >= DateTime.UtcNow.Date && s.ExpiryDate <= DateTime.UtcNow.Date.AddDays(7))
            .OrderBy(s => s.ExpiryDate)
            .Select(s => new ExpiringSoonItem(s.Id, s.Student.Name, s.Package.Name, s.ExpiryDate, s.RemainingSessions))
            .Take(20)
            .ToListAsync(ct);
        return Ok(new DashboardDto(studentCount, activeSubs, paymentsDue, monthRevenue, expiringSoon));
    }

    /// <summary>Month-by-month active students (distinct), active subscriptions, and payment revenue for the tenant.</summary>
    [HttpGet("monthly")]
    public async Task<ActionResult<MonthlyReportDto>> Monthly([FromQuery] int months = 12, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        months = Math.Clamp(months, 1, 36);
        var anchor = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var rows = new List<MonthlyReportRowDto>();

        for (var i = months - 1; i >= 0; i--)
        {
            var monthStart = anchor.AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1);
            var overlap = _db.Subscriptions.AsNoTracking()
                .Where(s => s.StartDate < monthEnd && s.ExpiryDate >= monthStart && s.Status != Entities.SubscriptionStatus.Cancelled);

            var activeStudentCount = await overlap.Select(s => s.StudentId).Distinct().CountAsync(ct);
            var activeSubscriptionCount = await overlap.CountAsync(ct);
            var revenue = await _db.Payments.AsNoTracking()
                .Where(p => p.PaidAt >= monthStart && p.PaidAt < monthEnd)
                .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

            rows.Add(new MonthlyReportRowDto(
                monthStart.Year,
                monthStart.Month,
                monthStart.ToString("MMM yyyy"),
                activeStudentCount,
                activeSubscriptionCount,
                revenue));
        }

        return Ok(new MonthlyReportDto(rows));
    }
}
