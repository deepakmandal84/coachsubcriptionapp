using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Helpers;
using CoachSubscriptionApi.Services;
using CoachSubscriptionApi.Services.Notifications;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IReminderService _reminder;

    public ParentController(AppDbContext db, IReminderService reminder)
    {
        _db = db;
        _reminder = reminder;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult<ParentPortalViewDto>> GetByToken(string token, CancellationToken ct)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == link.StudentId, ct);
        if (student == null) return NotFound();
        Subscription? sub = null;
        if (link.SubscriptionId.HasValue)
            sub = await _db.Subscriptions.AsNoTracking().Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == link.SubscriptionId.Value, ct);
        var coach = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.Id == link.TenantId, ct);
        var classUsage = await ClassUsageQueries.GetSummaryAsync(_db, link.TenantId, link.StudentId, link.SubscriptionId, ct);
        return Ok(new ParentPortalViewDto(
            coach?.AcademyName ?? "My Coach",
            coach?.LogoUrl,
            coach?.PrimaryColor,
            student.Name,
            sub?.Package.Name,
            sub?.RemainingSessions,
            sub?.ExpiryDate,
            sub?.PaymentStatus.ToString() ?? "",
            sub?.Id,
            classUsage));
    }

    [HttpGet("{token}/sessions")]
    public async Task<ActionResult<List<SessionListDto>>> ListSessions(string token, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var q = _db.Sessions.AsNoTracking().Where(s => s.TenantId == link.TenantId);
        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
            q = q.Where(x => x.Date >= fromUtc);
        }
        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value.Date, DateTimeKind.Utc);
            q = q.Where(x => x.Date <= toUtc);
        }
        try
        {
            var sessions = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
                .Select(x => new SessionListDto(
                    x.Id,
                    x.Date,
                    x.StartTime,
                    x.Type.ToString(),
                    x.Title,
                    x.Location,
                    x.CreatedAt,
                    x.Bookings.Count,
                    x.Attendances.Count
                ))
                .ToListAsync(ct);
            return Ok(sessions);
        }
        catch (PostgresException ex) when (ex.SqlState is "42P01" or "42703")
        {
            var fallback = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
                .Select(x => new SessionListDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, x.CreatedAt, 0, 0))
                .ToListAsync(ct);
            return Ok(fallback);
        }
    }

    [HttpPost("{token}/sessions/{sessionId:guid}/book")]
    public async Task<ActionResult> BookSession(string token, Guid sessionId, [FromBody] BookSessionRequest request, CancellationToken ct)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.TenantId == link.TenantId, ct);
        if (session == null) return NotFound("Class not found.");
        if (session.Date < DateTime.UtcNow.Date)
            return BadRequest("This class date has passed.");

        if (await _db.SessionBookings.AnyAsync(b => b.SessionId == sessionId && b.StudentId == student.Id, ct))
            return Conflict("Already signed up for this class.");

        _db.SessionBookings.Add(new SessionBooking
        {
            Id = Guid.NewGuid(),
            TenantId = link.TenantId,
            SessionId = session.Id,
            StudentId = student.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("{token}/request-renewal")]
    public async Task<ActionResult> RequestRenewal(string token, CancellationToken ct)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == link.StudentId, ct);
        Subscription? sub = null;
        if (link.SubscriptionId.HasValue)
            sub = await _db.Subscriptions.AsNoTracking().Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == link.SubscriptionId.Value, ct);
        if (student == null) return NotFound();

        var existingPending = await _db.RenewalRequests
            .AnyAsync(r =>
                r.TenantId == link.TenantId &&
                r.StudentId == link.StudentId &&
                (r.SubscriptionId == link.SubscriptionId || (link.SubscriptionId == null && r.SubscriptionId == null)) &&
                r.Status == RenewalRequestStatus.Pending, ct);
        if (!existingPending)
        {
            _db.RenewalRequests.Add(new RenewalRequest
            {
                Id = Guid.NewGuid(),
                TenantId = link.TenantId,
                StudentId = link.StudentId,
                SubscriptionId = link.SubscriptionId,
                Status = RenewalRequestStatus.Pending,
                RequestedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        var packageName = sub?.Package.Name ?? "current package";
        await _reminder.NotifyCoachRequestRenewalAsync(link.TenantId, student.Name, student.Email, student.Phone, packageName, ct);
        return Ok();
    }

    private async Task<ParentPortalLink?> ResolveLinkAsync(string token, CancellationToken ct)
    {
        var hash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
        var link = await _db.ParentPortalLinks
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.TokenHash == hash && l.TokenExpiresAt > DateTime.UtcNow, ct);
        return link;
    }
}
