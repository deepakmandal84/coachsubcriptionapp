using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Helpers;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/schedule")]
[AllowAnonymous]
public class ScheduleController : ControllerBase
{
    private readonly AppDbContext _db;

    public ScheduleController(AppDbContext db) => _db = db;

    [HttpGet("{token}/sessions")]
    public async Task<ActionResult<PublicScheduleViewDto>> ListSessions(string token, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var coach = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.ScheduleShareToken == token && c.IsActive, ct);
        if (coach == null || string.IsNullOrEmpty(coach.ScheduleShareToken))
            return NotFound("Invalid schedule link.");

        var q = _db.Sessions.AsNoTracking().Where(s => s.TenantId == coach.Id);
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

        List<SessionListDto> sessions;
        try
        {
            sessions = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
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
        }
        catch (PostgresException ex) when (ex.SqlState is "42P01" or "42703")
        {
            sessions = await q.OrderBy(x => x.Date).ThenBy(x => x.StartTime)
                .Select(x => new SessionListDto(x.Id, x.Date, x.StartTime, x.Type.ToString(), x.Title, x.Location, x.CreatedAt, 0, 0))
                .ToListAsync(ct);
        }

        var packages = await _db.Packages.AsNoTracking()
            .Where(p => p.TenantId == coach.Id)
            .OrderBy(p => p.Price)
            .Select(p => new PublicPackageDto(p.Id, p.Name, p.Price, p.TotalSessions, p.Type.ToString(), p.ValidityDays, p.Category))
            .ToListAsync(ct);

        return Ok(new PublicScheduleViewDto(coach.AcademyName ?? coach.Name, coach.LogoUrl, coach.PrimaryColor, sessions, packages));
    }

    [HttpPost("{token}/sessions/{sessionId:guid}/book")]
    public async Task<ActionResult> Book(string token, Guid sessionId, [FromBody] BookSessionRequest request, CancellationToken ct)
    {
        var coach = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.ScheduleShareToken == token && c.IsActive, ct);
        if (coach == null || string.IsNullOrEmpty(coach.ScheduleShareToken))
            return NotFound("Invalid schedule link.");

        var normPhone = PhoneNormalizer.Normalize(request.Phone);
        var email = request.Email?.Trim();
        var normEmail = string.IsNullOrWhiteSpace(email) ? null : email.ToLowerInvariant();
        if (normPhone == null && normEmail == null)
            return BadRequest("Please enter either a valid phone number or email address.");

        var candidates = await _db.Students
            .AsNoTracking()
            .Where(s => s.TenantId == coach.Id && s.Status == StudentStatus.Active)
            .ToListAsync(ct);
        var matches = candidates
            .Where(s =>
                (normPhone != null && PhoneNormalizer.Normalize(s.Phone) == normPhone) ||
                (normEmail != null && s.Email != null && s.Email.Trim().ToLowerInvariant() == normEmail))
            .ToList();
        if (matches.Count == 0)
            return BadRequest("No active student found with this phone or email.");
        if (matches.Count > 1)
            return BadRequest("Multiple active students match this phone/email. Ask your coach to fix duplicates.");

        var student = matches[0];
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.TenantId == coach.Id, ct);
        if (session == null) return NotFound("Class not found.");
        if (session.Date < DateTime.UtcNow.Date)
            return BadRequest("This class date has passed.");

        if (await _db.SessionBookings.AnyAsync(b => b.SessionId == sessionId && b.StudentId == student.Id, ct))
            return Conflict("You are already signed up for this class.");

        _db.SessionBookings.Add(new SessionBooking
        {
            Id = Guid.NewGuid(),
            TenantId = coach.Id,
            SessionId = session.Id,
            StudentId = student.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("{token}/trial-request")]
    public async Task<ActionResult> TrialRequest(string token, [FromBody] TrialRequestDto request, CancellationToken ct)
    {
        var coach = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.ScheduleShareToken == token && c.IsActive, ct);
        if (coach == null || string.IsNullOrEmpty(coach.ScheduleShareToken))
            return NotFound("Invalid schedule link.");
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");
        var normalizedPhone = PhoneNormalizer.Normalize(request.Phone);
        var email = request.Email?.Trim();
        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : email.ToLowerInvariant();
        if (normalizedPhone == null && normalizedEmail == null)
            return BadRequest("Please provide either a valid phone number or email address for trial.");

        var desiredPackage = request.DesiredPackageId.HasValue
            ? await _db.Packages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.DesiredPackageId.Value && p.TenantId == coach.Id, ct)
            : null;

        var notes = (request.Notes ?? string.Empty).Trim();
        if (desiredPackage != null)
        {
            var packageLine = $"Trial interest package: {desiredPackage.Name}";
            notes = string.IsNullOrWhiteSpace(notes) ? packageLine : $"{notes}\n{packageLine}";
        }

        _db.Students.Add(new Student
        {
            Id = Guid.NewGuid(),
            TenantId = coach.Id,
            Name = request.Name.Trim(),
            ParentName = request.ParentName?.Trim(),
            Email = normalizedEmail,
            Phone = normalizedPhone,
            Notes = string.IsNullOrWhiteSpace(notes) ? "Trial request from public schedule." : notes,
            Status = StudentStatus.Trial,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok();
    }
}
