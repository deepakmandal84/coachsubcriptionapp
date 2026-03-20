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
}
