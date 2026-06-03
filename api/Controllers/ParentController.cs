using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        if (student.Status == StudentStatus.Inactive)
            return StatusCode(StatusCodes.Status403Forbidden, "This client account is deactivated. Ask your coach to reactivate you.");
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
            classUsage,
            student.CreatedAt));
    }

    [HttpGet("{token}/sessions")]
    public async Task<ActionResult<List<ParentSessionListDto>>> ListSessions(string token, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var studentId = link.StudentId;
        var q = SessionPrivateClientHelper.ApplyClientVisibilityFilter(
            _db.Sessions.AsNoTracking().Where(s => s.TenantId == link.TenantId),
            studentId);
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

        var sessions = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
            .Select(x => new ParentSessionListDto(
                x.Id,
                x.Date,
                x.StartTime,
                x.Type.ToString(),
                x.Title,
                x.Location,
                x.Bookings.Any(b => b.StudentId == studentId)
            ))
            .ToListAsync(ct);
        return Ok(sessions);
    }

    [HttpGet("{token}/attended-classes")]
    public async Task<ActionResult<List<ParentAttendedClassDto>>> ListAttendedClasses(string token, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        var from = DateTime.SpecifyKind(student.CreatedAt.Date, DateTimeKind.Utc);
        var attended = await _db.Attendances.AsNoTracking()
            .Where(a =>
                a.StudentId == link.StudentId &&
                a.Present &&
                a.Session.TenantId == link.TenantId &&
                a.Session.Date >= from)
            .OrderByDescending(a => a.Session.Date)
            .ThenByDescending(a => a.Session.StartTime)
            .Select(a => new ParentAttendedClassDto(
                a.SessionId,
                a.Session.Date,
                a.Session.StartTime,
                a.Session.Type.ToString(),
                a.Session.Title,
                a.Session.Location,
                a.SessionsConsumed))
            .ToListAsync(ct);
        return Ok(attended);
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
        if (!SessionPrivateClientHelper.CanClientSelfBook(session))
            return BadRequest("Personal training sessions are scheduled by your coach and cannot be booked here.");
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

    [HttpGet("{token}/progress")]
    public async Task<ActionResult<ParentProgressViewDto>> GetProgress(string token, [FromQuery] int months = 12, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.IgnoreQueryFilters().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        var coach = await _db.Coaches.IgnoreQueryFilters().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == link.TenantId, ct);

        var from = DateTime.UtcNow.Date.AddMonths(-Math.Clamp(months, 1, 60));
        var entries = await _db.ProgressCheckIns.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.TenantId == link.TenantId && p.StudentId == link.StudentId && p.RecordedOn >= from)
            .OrderByDescending(p => p.RecordedOn)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        return Ok(ProgressMeasurementHelper.BuildParentView(student, coach?.AcademyName ?? "My Coach", entries));
    }

    [HttpPost("{token}/progress/preview-body-fat")]
    public async Task<ActionResult<BodyFatPreviewDto>> PreviewBodyFat(string token, [FromBody] BodyFatPreviewRequest request, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");
        var student = await _db.Students.IgnoreQueryFilters().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        return Ok(BodyCompositionHelper.BuildPreview(student, request));
    }

    [HttpPost("{token}/progress")]
    public async Task<ActionResult<ProgressCheckInDto>> CreateProgress(string token, [FromBody] CreateProgressCheckInRequest request, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        var entry = new ProgressCheckIn
        {
            Id = Guid.NewGuid(),
            TenantId = link.TenantId,
            StudentId = student.Id,
            RecordedOn = DateTime.SpecifyKind(request.RecordedOn.Date, DateTimeKind.Utc),
            Source = ProgressSource.ParentPortal,
            CreatedAt = DateTime.UtcNow,
        };
        ProgressMeasurementHelper.ApplyCheckInMetrics(entry, student, request);
        _db.ProgressCheckIns.Add(entry);
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToDto(entry, student.MeasurementUnit));
    }

    [HttpPut("{token}/progress-profile")]
    public async Task<ActionResult<ProgressProfileDto>> UpdateProgressProfile(string token, [FromBody] UpdateProgressProfileRequest request, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        ProgressMeasurementHelper.ApplyProfileUpdate(student, request);
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToProfileDto(student));
    }

    [HttpPut("{token}/measurement-unit")]
    public async Task<ActionResult> UpdateMeasurementUnit(string token, [FromBody] UpdateStudentMeasurementUnitRequest request, CancellationToken ct = default)
    {
        var link = await ResolveLinkAsync(token, ct);
        if (link == null) return NotFound("Invalid or expired link.");

        var student = await _db.Students.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == link.StudentId && s.TenantId == link.TenantId, ct);
        if (student == null) return NotFound();

        if (!Enum.TryParse<MeasurementUnit>(request.MeasurementUnit, true, out var unit))
            return BadRequest("MeasurementUnit must be Metric or Imperial.");

        student.MeasurementUnit = unit;
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
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
