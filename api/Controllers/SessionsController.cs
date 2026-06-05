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
        var filterByCoach = assignedCoachId.HasValue;
        if (filterByCoach)
        {
            var coachOk = await _db.Coaches.AsNoTracking()
                .AnyAsync(c => c.Id == assignedCoachId!.Value && ((c.Id == tid && c.ClubTenantId == null) || c.ClubTenantId == tid), ct);
            if (!coachOk) return BadRequest("Unknown coach for this club.");
            q = q.Where(s => s.SessionCoaches.Any(sc => sc.CoachId == assignedCoachId!.Value));
        }
        if (from.HasValue)
        {
            var fromUtc = SessionDateHelper.ToUtcDateOnly(from.Value);
            q = q.Where(x => x.Date >= fromUtc);
        }
        if (to.HasValue)
        {
            var toUtc = SessionDateHelper.ToUtcDateOnly(to.Value);
            q = q.Where(x => x.Date <= toUtc);
        }

        try
        {
            return Ok(await ListSessionsWithCoachesAsync(q, ct));
        }
        catch (Exception ex) when (IsSchemaOrCoachJoinError(ex))
        {
            var qFallback = _db.Sessions.AsNoTracking();
            if (from.HasValue)
            {
                var fromUtc = SessionDateHelper.ToUtcDateOnly(from.Value);
                qFallback = qFallback.Where(x => x.Date >= fromUtc);
            }
            if (to.HasValue)
            {
                var toUtc = SessionDateHelper.ToUtcDateOnly(to.Value);
                qFallback = qFallback.Where(x => x.Date <= toUtc);
            }
            return Ok(await ListSessionsBasicAsync(qFallback, ct));
        }
    }

    private static async Task<List<SessionListDto>> ListSessionsWithCoachesAsync(IQueryable<Session> q, CancellationToken ct)
    {
        var rows = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
            .Select(x => new
            {
                x.Id,
                x.Date,
                x.StartTime,
                x.Type,
                x.Title,
                x.Location,
                x.CreatedAt,
                BookingCount = x.Bookings.Count,
                AttendanceCount = x.Attendances.Count,
                CoachIds = x.SessionCoaches.OrderBy(sc => sc.Coach.Name).Select(sc => sc.CoachId).ToList(),
                CoachNames = x.SessionCoaches.OrderBy(sc => sc.Coach.Name).Select(sc => sc.Coach.Name).ToList(),
            })
            .ToListAsync(ct);
        return rows.Select(r => SessionDtoMapper.ToListDto(
            r.Id, r.Date, r.StartTime, r.Type, r.Title, r.Location, r.CreatedAt,
            r.BookingCount, r.AttendanceCount, r.CoachIds, r.CoachNames)).ToList();
    }

    private static async Task<List<SessionListDto>> ListSessionsBasicAsync(IQueryable<Session> q, CancellationToken ct)
    {
        var rows = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
            .Select(x => new
            {
                x.Id,
                x.Date,
                x.StartTime,
                x.Type,
                x.Title,
                x.Location,
                x.CreatedAt,
                BookingCount = x.Bookings.Count,
                AttendanceCount = x.Attendances.Count,
            })
            .ToListAsync(ct);
        return rows.Select(r => SessionDtoMapper.ToListDto(
            r.Id, r.Date, r.StartTime, r.Type, r.Title, r.Location, r.CreatedAt,
            r.BookingCount, r.AttendanceCount, new List<Guid>(), new List<string>())).ToList();
    }

    private static bool IsSchemaOrCoachJoinError(Exception ex)
    {
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (e is PostgresException pg && IsSchemaMismatch(pg))
                return true;
        }
        return false;
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
        return Ok(SessionDtoMapper.ToDetailDto(x, bookings, attendances, assigned, canMark));
    }

    private static string? PhoneLast4(string? phone)
    {
        var n = PhoneNormalizer.Normalize(phone);
        if (n == null) return null;
        return n.Length <= 4 ? n : n[^4..];
    }

    private async Task<List<AssignedCoachDto>> LoadAssignedCoachesAsync(Guid sessionId, CancellationToken ct) =>
        await _db.SessionCoaches.AsNoTracking()
            .Where(sc => sc.SessionId == sessionId)
            .OrderBy(sc => sc.Coach.Name)
            .Select(sc => new AssignedCoachDto(sc.CoachId, sc.Coach.Name))
            .ToListAsync(ct);

    private async Task<List<SessionBookingDto>> LoadSessionBookingsAsync(Guid sessionId, CancellationToken ct)
    {
        var rows = await _db.SessionBookings.AsNoTracking()
            .Where(b => b.SessionId == sessionId)
            .Select(b => new { b.Id, b.StudentId, Name = b.Student.Name, b.Student.Phone })
            .ToListAsync(ct);
        return rows.Select(b => new SessionBookingDto(b.Id, b.StudentId, b.Name, PhoneLast4(b.Phone))).ToList();
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
        DateTime sessionDate;
        try
        {
            sessionDate = SessionDateHelper.ParseDateOnly(request.Date);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid date. Use YYYY-MM-DD.");
        }

        var tenantId = _tenant.TenantId.Value;
        var title = request.Title;
        Guid? privateStudentId = null;
        List<Guid> groupStudentIds = [];
        var rosterOnly = false;
        if (SessionPrivateClientHelper.IsPrivate(sessionType))
        {
            if (!request.StudentId.HasValue)
                return BadRequest("Select a client for personal training sessions.");
            var student = await SessionPrivateClientHelper.GetActiveStudentAsync(_db, tenantId, request.StudentId.Value, ct);
            if (student == null) return BadRequest("Client not found or is not on the active roster.");
            privateStudentId = student.Id;
            title = SessionPrivateClientHelper.ResolveTitle(request.Title, student.Name);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest("Title is required.");
            if (request.StudentIds is { Count: > 0 })
            {
                try
                {
                    groupStudentIds = await SessionRosterService.ValidateActiveStudentIdsAsync(
                        _db, tenantId, request.StudentIds, ct);
                    rosterOnly = true;
                }
                catch (InvalidOperationException)
                {
                    return BadRequest("One or more clients were not found on the active roster.");
                }
            }
        }

        var session = new Session
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Date = sessionDate,
            StartTime = startTime,
            Type = sessionType,
            Title = title.Trim(),
            Location = request.Location,
            RosterOnly = rosterOnly,
            CreatedAt = DateTime.UtcNow
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(ct);
        await ReplaceSessionCoachesAsync(session.Id, coachIds, ct);
        if (privateStudentId.HasValue)
            await SessionPrivateClientHelper.EnsureBookingAsync(_db, tenantId, session.Id, privateStudentId.Value, ct);
        else if (groupStudentIds.Count > 0)
            await SessionRosterService.BookStudentsAsync(_db, tenantId, session.Id, groupStudentIds, ct);
        await _db.SaveChangesAsync(ct);
        var assigned = await LoadAssignedCoachesAsync(session.Id, ct);
        var bookings = await LoadSessionBookingsAsync(session.Id, ct);
        var canMark = ClubStaffPermissions.IsClubOwner(_tenant) || ClubStaffPermissions.IsAdminActingAsTenant(_tenant) || coachIds.Contains(_tenant.UserId!.Value);
        return CreatedAtAction(nameof(Get), new { id = session.Id },
            SessionDtoMapper.ToDetailDto(session, bookings, new List<AttendanceDto>(), assigned, canMark));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<BulkCreateSessionsResponse>> CreateBulk([FromBody] BulkCreateSessionsRequest request, CancellationToken ct)
    {
        if (!await ClubStaffPermissions.CanCreateSessionsAsync(_db, _tenant, ct)) return Forbid();
        if (request.Dates == null || request.Dates.Count == 0)
            return BadRequest("Select at least one date.");
        if (request.Dates.Count > 62)
            return BadRequest("At most 62 dates per bulk create.");
        if (!TimeSpan.TryParse(request.StartTime, out var startTime)) startTime = TimeSpan.Zero;
        if (!Enum.TryParse<SessionType>(request.Type, true, out var sessionType))
            return BadRequest("Invalid session type. Use Group or Private.");
        if (sessionType == SessionType.Group && string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");
        if (SessionPrivateClientHelper.IsPrivate(sessionType) && !request.StudentId.HasValue)
            return BadRequest("Select a client for personal training sessions.");

        var coachIds = NormalizeCoachIds(request.CoachIds, _tenant.TenantId!.Value);
        if (!await AreCoachIdsInClubAsync(_tenant.TenantId!.Value, coachIds, ct))
            return BadRequest("One or more coaches are not part of this club.");

        var distinctDates = new List<DateTime>();
        foreach (var raw in request.Dates)
        {
            try
            {
                var d = SessionDateHelper.ParseDateOnly(raw);
                if (!distinctDates.Any(x => x == d))
                    distinctDates.Add(d);
            }
            catch (ArgumentException)
            {
                return BadRequest($"Invalid date: {raw}. Use YYYY-MM-DD.");
            }
        }

        if (distinctDates.Count == 0)
            return BadRequest("No valid dates provided.");

        var tenantId = _tenant.TenantId!.Value;
        var bulkTitle = request.Title?.Trim() ?? "";
        Guid? bulkStudentId = null;
        List<Guid> bulkGroupStudentIds = [];
        var bulkRosterOnly = false;
        if (SessionPrivateClientHelper.IsPrivate(sessionType))
        {
            var student = await SessionPrivateClientHelper.GetActiveStudentAsync(_db, tenantId, request.StudentId!.Value, ct);
            if (student == null) return BadRequest("Client not found or is not on the active roster.");
            bulkStudentId = student.Id;
            bulkTitle = SessionPrivateClientHelper.ResolveTitle(request.Title, student.Name);
        }
        else if (request.StudentIds is { Count: > 0 })
        {
            try
            {
                bulkGroupStudentIds = await SessionRosterService.ValidateActiveStudentIdsAsync(
                    _db, tenantId, request.StudentIds, ct);
                bulkRosterOnly = true;
            }
            catch (InvalidOperationException)
            {
                return BadRequest("One or more clients were not found on the active roster.");
            }
        }

        var sessions = distinctDates.Select(d => new Session
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Date = d,
            StartTime = startTime,
            Type = sessionType,
            Title = bulkTitle,
            Location = request.Location,
            RosterOnly = bulkRosterOnly,
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        _db.Sessions.AddRange(sessions);
        await _db.SaveChangesAsync(ct);

        var links = new List<SessionCoach>();
        foreach (var session in sessions)
        {
            foreach (var cid in coachIds.Distinct())
                links.Add(new SessionCoach { SessionId = session.Id, CoachId = cid });
        }
        _db.SessionCoaches.AddRange(links);
        if (bulkStudentId.HasValue)
        {
            foreach (var session in sessions)
                await SessionPrivateClientHelper.EnsureBookingAsync(_db, tenantId, session.Id, bulkStudentId.Value, ct);
        }
        else if (bulkGroupStudentIds.Count > 0)
        {
            foreach (var session in sessions)
                await SessionRosterService.BookStudentsAsync(_db, tenantId, session.Id, bulkGroupStudentIds, ct);
        }
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return Ok(new BulkCreateSessionsResponse(sessions.Count));
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
        try
        {
            x.Date = SessionDateHelper.ParseDateOnly(request.Date);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid date. Use YYYY-MM-DD.");
        }
        x.StartTime = startTime;
        x.Type = sessionType;
        var tenantId = _tenant.TenantId!.Value;
        if (SessionPrivateClientHelper.IsPrivate(sessionType))
        {
            x.RosterOnly = false;
            if (!request.StudentId.HasValue)
                return BadRequest("Select a client for personal training sessions.");
            try
            {
                x.Title = await SessionPrivateClientHelper.AssignPrivateClientAsync(
                    _db, tenantId, x.Id, request.StudentId.Value, request.Title, ct);
            }
            catch (InvalidOperationException)
            {
                return BadRequest("Client not found or is not on the active roster.");
            }
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest("Title is required.");
            x.Title = request.Title.Trim();
            if (request.StudentIds != null)
            {
                try
                {
                    var groupIds = await SessionRosterService.ValidateActiveStudentIdsAsync(
                        _db, tenantId, request.StudentIds, ct);
                    x.RosterOnly = groupIds.Count > 0;
                    await SessionRosterService.SyncGroupBookingsAsync(_db, tenantId, x.Id, groupIds, ct);
                }
                catch (InvalidOperationException)
                {
                    return BadRequest("One or more clients were not found on the active roster.");
                }
            }
        }
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
        var bookings = await LoadSessionBookingsAsync(x.Id, ct);
        var attendances = x.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        var assigned = await LoadAssignedCoachesAsync(x.Id, ct);
        var canMark = await CanTakeAttendanceForSessionAsync(x, ct);
        return Ok(SessionDtoMapper.ToDetailDto(x, bookings, attendances, assigned, canMark));
    }

    [HttpPost("{id:guid}/bookings")]
    public async Task<ActionResult<SessionDetailDto>> AddBookings(Guid id, [FromBody] AddSessionBookingsRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (request.StudentIds == null || request.StudentIds.Count == 0)
            return BadRequest("Select at least one client.");

        var session = await _db.Sessions
            .Include(s => s.Attendances).ThenInclude(a => a.Student)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return NotFound();
        if (!await CanTakeAttendanceForSessionAsync(session, ct)) return Forbid();

        var tenantId = _tenant.TenantId.Value;
        try
        {
            var ids = await SessionRosterService.ValidateActiveStudentIdsAsync(_db, tenantId, request.StudentIds, ct);
            await SessionRosterService.BookStudentsAsync(_db, tenantId, session.Id, ids, ct);
            await _db.SaveChangesAsync(ct);
        }
        catch (InvalidOperationException)
        {
            return BadRequest("One or more clients were not found on the active roster.");
        }

        var bookings = await LoadSessionBookingsAsync(session.Id, ct);
        var attendances = session.Attendances.Select(a => new AttendanceDto(a.Id, a.StudentId, a.Student.Name, a.Present, a.SessionsConsumed)).ToList();
        var assigned = await LoadAssignedCoachesAsync(session.Id, ct);
        var canMark = await CanTakeAttendanceForSessionAsync(session, ct);
        return Ok(SessionDtoMapper.ToDetailDto(session, bookings, attendances, assigned, canMark));
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
