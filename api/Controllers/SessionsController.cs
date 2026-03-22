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

    private async Task<bool> CanTakeAttendanceForSessionAsync(Session session, CancellationToken ct)
    {
        if (_tenant.UserId == null || _tenant.TenantId == null) return false;
        if (session.TenantId != _tenant.TenantId) return false;
        if (_tenant.UserId == session.TenantId) return true;
        if (ClubStaffPermissions.IsAdminActingAsTenant(_tenant)) return true;
        return await _db.SessionCoaches.AsNoTracking()
            .AnyAsync(sc => sc.SessionId == session.Id && sc.CoachId == _tenant.UserId.Value, ct);
    }

    private static List<Guid> NormalizeCoachIds(List<Guid>? coachIds, Guid tenantId)
    {
        if (coachIds is not { Count: > 0 })
            return new List<Guid> { tenantId };
        return coachIds.Distinct().ToList();
    }

    private async Task<bool> AreCoachIdsInClubAsync(Guid tenantId, List<Guid> ids, CancellationToken ct)
    {
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0) return false;
        var count = await _db.Coaches.AsNoTracking()
            .Where(c => distinct.Contains(c.Id))
            .Where(c => (c.Id == tenantId && c.ClubTenantId == null) || c.ClubTenantId == tenantId)
            .CountAsync(ct);
        return count == distinct.Count;
    }

    private async Task ReplaceSessionCoachesAsync(Guid sessionId, List<Guid> coachIds, CancellationToken ct)
    {
        var existing = await _db.SessionCoaches.Where(sc => sc.SessionId == sessionId).ToListAsync(ct);
        _db.SessionCoaches.RemoveRange(existing);
        foreach (var cid in coachIds.Distinct())
        {
            _db.SessionCoaches.Add(new SessionCoach { SessionId = sessionId, CoachId = cid });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<SessionListDto>>> List([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] Guid? assignedCoachId, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var tid = _tenant.TenantId.Value;
        var q = _db.Sessions.AsNoTracking();
        if (assignedCoachId.HasValue)
        {
            var coachOk = await _db.Coaches.AsNoTracking()
                .AnyAsync(c => c.Id == assignedCoachId.Value && ((c.Id == tid && c.ClubTenantId == null) || c.ClubTenantId == tid), ct);
            if (!coachOk) return BadRequest("Unknown coach for this club.");
            q = q.Where(s => s.SessionCoaches.Any(sc => sc.CoachId == assignedCoachId.Value));
        }
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
                    x.Attendances.Count,
                    x.SessionCoaches.OrderBy(sc => sc.Coach.Name).Select(sc => sc.CoachId).ToList(),
                    x.SessionCoaches.OrderBy(sc => sc.Coach.Name).Select(sc => sc.Coach.Name).ToList()
                ))
                .ToListAsync(ct);
            return Ok(list);
        }
        catch (PostgresException ex) when (IsSchemaMismatch(ex))
        {
            var fallback = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
                .Select(x => new SessionListDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, x.CreatedAt, 0, 0, new List<Guid>(), new List<string>()))
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
            .Include(s => s.SessionCoaches).ThenInclude(sc => sc.Coach)
            .Include(s => s.Attendances).ThenInclude(a => a.Student)
            .Include(s => s.Bookings).ThenInclude(b => b.Student)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        var canMark = await CanTakeAttendanceForSessionAsync(x, ct);
        var bookings = x.Bookings.Select(b => new SessionBookingDto(b.Id, b.StudentId, b.Student.Name, PhoneLast4(b.Student.Phone))).ToList();
        var attendances = x.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        var assigned = x.SessionCoaches.OrderBy(sc => sc.Coach.Name).Select(sc => new AssignedCoachDto(sc.CoachId, sc.Coach.Name)).ToList();
        return Ok(new SessionDetailDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, bookings, attendances, assigned, x.CreatedAt, canMark));
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
        if (!await ClubStaffPermissions.CanCreateSessionsAsync(_db, _tenant, ct)) return Forbid();
        if (!TimeSpan.TryParse(request.StartTime, out var startTime)) startTime = TimeSpan.Zero;
        if (!Enum.TryParse<SessionType>(request.Type, true, out var sessionType))
            return BadRequest("Invalid session type. Use Group or Private.");
        var coachIds = NormalizeCoachIds(request.CoachIds, _tenant.TenantId!.Value);
        if (!await AreCoachIdsInClubAsync(_tenant.TenantId!.Value, coachIds, ct))
            return BadRequest("One or more coaches are not part of this club.");
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
        await ReplaceSessionCoachesAsync(session.Id, coachIds, ct);
        await _db.SaveChangesAsync(ct);
        var assigned = await _db.SessionCoaches.AsNoTracking()
            .Where(sc => sc.SessionId == session.Id)
            .Select(sc => new AssignedCoachDto(sc.CoachId, sc.Coach.Name))
            .OrderBy(a => a.Name)
            .ToListAsync(ct);
        var canMark = ClubStaffPermissions.IsClubOwner(_tenant) || ClubStaffPermissions.IsAdminActingAsTenant(_tenant) || coachIds.Contains(_tenant.UserId!.Value);
        return CreatedAtAction(nameof(Get), new { id = session.Id }, new SessionDetailDto(session.Id, session.Date, session.StartTime, session.Type.ToString(), session.Title, session.Location, new List<SessionBookingDto>(), new List<AttendanceDto>(), assigned, session.CreatedAt, canMark));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SessionDetailDto>> Update(Guid id, [FromBody] UpdateSessionRequest request, CancellationToken ct)
    {
        if (!await ClubStaffPermissions.CanCreateSessionsAsync(_db, _tenant, ct)) return Forbid();
        var x = await _db.Sessions
            .Include(s => s.SessionCoaches).ThenInclude(sc => sc.Coach)
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
        if (request.CoachIds != null)
        {
            var coachIds = NormalizeCoachIds(request.CoachIds, _tenant.TenantId!.Value);
            if (!await AreCoachIdsInClubAsync(_tenant.TenantId!.Value, coachIds, ct))
                return BadRequest("One or more coaches are not part of this club.");
            await ReplaceSessionCoachesAsync(x.Id, coachIds, ct);
        }
        await _db.SaveChangesAsync(ct);
        var bookings = x.Bookings.Select(b => new SessionBookingDto(b.Id, b.StudentId, b.Student.Name, PhoneLast4(b.Student.Phone))).ToList();
        var attendances = x.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        var assigned = await _db.SessionCoaches.AsNoTracking()
            .Where(sc => sc.SessionId == x.Id)
            .Select(sc => new AssignedCoachDto(sc.CoachId, sc.Coach.Name))
            .OrderBy(a => a.Name)
            .ToListAsync(ct);
        var canMark = await CanTakeAttendanceForSessionAsync(x, ct);
        return Ok(new SessionDetailDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, bookings, attendances, assigned, x.CreatedAt, canMark));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!await ClubStaffPermissions.CanCreateSessionsAsync(_db, _tenant, ct)) return Forbid();
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
        var session = await _db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return NotFound();
        if (!await CanTakeAttendanceForSessionAsync(session, ct)) return Forbid();
        var sessionWithAtt = await _db.Sessions.AsNoTracking().Include(s => s.Attendances).ThenInclude(a => a.Student).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sessionWithAtt == null) return NotFound();
        var list = sessionWithAtt.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        return Ok(list);
    }

    [HttpPut("{id:guid}/attendance")]
    public async Task<ActionResult<SetAttendanceResponse>> SetAttendance(Guid id, [FromBody] SetAttendanceRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var session = await _db.Sessions.Include(s => s.Attendances).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return NotFound();
        if (!await CanTakeAttendanceForSessionAsync(session, ct)) return Forbid();
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
