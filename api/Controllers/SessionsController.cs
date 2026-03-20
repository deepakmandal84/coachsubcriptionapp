using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Helpers;
using CoachSubscriptionApi.Services;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public SessionsController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<ActionResult<List<SessionListDto>>> List([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var q = _db.Sessions.AsNoTracking();
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
            var list = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
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
            return Ok(list);
        }
        catch (PostgresException ex) when (IsSchemaMismatch(ex))
        {
            var fallback = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
                .Select(x => new SessionListDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, x.CreatedAt, 0, 0))
                .ToListAsync(ct);
            return Ok(fallback);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SessionDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Sessions
            .AsNoTracking()
            .Include(s => s.Attendances).ThenInclude(a => a.Student)
            .Include(s => s.Bookings).ThenInclude(b => b.Student)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        var bookings = x.Bookings.Select(b => new SessionBookingDto(b.Id, b.StudentId, b.Student.Name, PhoneLast4(b.Student.Phone))).ToList();
        var attendances = x.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        return Ok(new SessionDetailDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, bookings, attendances, x.CreatedAt));
    }

    private static string? PhoneLast4(string? phone)
    {
        var n = PhoneNormalizer.Normalize(phone);
        if (n == null) return null;
        return n.Length <= 4 ? n : n[^4..];
    }

    private static bool IsSchemaMismatch(PostgresException ex)
        => ex.SqlState is "42P01" or "42703";

    [HttpPost]
    public async Task<ActionResult<SessionDetailDto>> Create([FromBody] CreateSessionRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (!TimeSpan.TryParse(request.StartTime, out var startTime)) startTime = TimeSpan.Zero;
        if (!Enum.TryParse<SessionType>(request.Type, true, out var sessionType))
            return BadRequest("Invalid session type. Use Group or Private.");
        var session = new Session
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId.Value,
            Date = DateTime.SpecifyKind(request.Date.Date, DateTimeKind.Utc),
            StartTime = startTime,
            Type = sessionType,
            Title = request.Title,
            Location = request.Location,
            CreatedAt = DateTime.UtcNow
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = session.Id }, new SessionDetailDto(session.Id, session.Date, session.StartTime, session.Type.ToString(), session.Title, session.Location, new List<SessionBookingDto>(), new List<AttendanceDto>(), session.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SessionDetailDto>> Update(Guid id, [FromBody] UpdateSessionRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Sessions
            .Include(s => s.Attendances).ThenInclude(a => a.Student)
            .Include(s => s.Bookings).ThenInclude(b => b.Student)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        if (!TimeSpan.TryParse(request.StartTime, out var startTime)) startTime = x.StartTime;
        if (!Enum.TryParse<SessionType>(request.Type, true, out var sessionType))
            return BadRequest("Invalid session type. Use Group or Private.");
        x.Date = DateTime.SpecifyKind(request.Date.Date, DateTimeKind.Utc);
        x.StartTime = startTime;
        x.Type = sessionType;
        x.Title = request.Title;
        x.Location = request.Location;
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        var bookings = x.Bookings.Select(b => new SessionBookingDto(b.Id, b.StudentId, b.Student.Name, PhoneLast4(b.Student.Phone))).ToList();
        var attendances = x.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        return Ok(new SessionDetailDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, bookings, attendances, x.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        _db.Sessions.Remove(x);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/attendance")]
    public async Task<ActionResult<List<AttendanceDto>>> GetAttendance(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var session = await _db.Sessions.AsNoTracking().Include(s => s.Attendances).ThenInclude(a => a.Student).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return NotFound();
        var list = session.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        return Ok(list);
    }

    [HttpPut("{id:guid}/attendance")]
    public async Task<ActionResult<SetAttendanceResponse>> SetAttendance(Guid id, [FromBody] SetAttendanceRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var session = await _db.Sessions.Include(s => s.Attendances).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return NotFound();
        foreach (var item in request.Items)
        {
            var att = session.Attendances.FirstOrDefault(a => a.StudentId == item.StudentId);
            var previousConsumed = att?.Present == true ? att.SessionsConsumed : 0;
            var newConsumed = item.Present ? item.SessionsConsumed : 0;
            var delta = newConsumed - previousConsumed;

            if (att != null)
            {
                att.Present = item.Present;
                att.SessionsConsumed = newConsumed;
                if (delta > 0)
                    await DecrementRemainingSessionsAsync(session.TenantId, item.StudentId, delta, ct);
            }
            else
            {
                var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == item.StudentId, ct);
                if (student == null) continue;
                _db.Attendances.Add(new Attendance
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    StudentId = item.StudentId,
                    Present = item.Present,
                    SessionsConsumed = newConsumed,
                    CreatedAt = DateTime.UtcNow
                });
                if (delta > 0)
                    await DecrementRemainingSessionsAsync(session.TenantId, item.StudentId, delta, ct);
            }
        }
        await _db.SaveChangesAsync(ct);
        var usageRows = new List<StudentClassUsageDto>();
        foreach (var sid in request.Items.Select(i => i.StudentId).Distinct())
        {
            var summary = await ClassUsageQueries.GetSummaryAsync(_db, _tenant.TenantId.Value, sid, null, ct);
            usageRows.Add(new StudentClassUsageDto(sid, summary));
        }
        return Ok(new SetAttendanceResponse(usageRows));
    }

    private async Task DecrementRemainingSessionsAsync(Guid tenantId, Guid studentId, int consumed, CancellationToken ct)
    {
        var activeSubs = await _db.Subscriptions
            .Where(s => s.TenantId == tenantId && s.StudentId == studentId && s.Status == SubscriptionStatus.Active && s.RemainingSessions != null)
            .OrderBy(s => s.ExpiryDate)
            .ToListAsync(ct);
        var remaining = consumed;
        foreach (var sub in activeSubs)
        {
            if (remaining <= 0 || sub.RemainingSessions == null) break;
            var deduct = Math.Min(remaining, sub.RemainingSessions.Value);
            sub.RemainingSessions -= deduct;
            sub.UpdatedAt = DateTime.UtcNow;
            if (sub.RemainingSessions <= 0) sub.Status = SubscriptionStatus.Expired;
            remaining -= deduct;
        }
    }
}
