using System.Security.Cryptography;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using CoachSubscriptionApi.Data;

using CoachSubscriptionApi.Entities;

using CoachSubscriptionApi.Services;

using CoachSubscriptionApi.Helpers;



namespace CoachSubscriptionApi.Controllers;



[ApiController]

[Route("api/[controller]")]

[Authorize]

public class CoachController : ControllerBase

{

    private readonly AppDbContext _db;

    private readonly ICurrentTenantService _tenant;

    private readonly IAuthService _auth;



    public CoachController(AppDbContext db, ICurrentTenantService tenant, IAuthService auth)

    {

        _db = db;

        _tenant = tenant;

        _auth = auth;

    }



    [HttpGet("me")]

    public async Task<ActionResult<CoachDto>> GetMe(CancellationToken ct)

    {

        if (_tenant.UserId == null) return Unauthorized();

        var c = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);

        if (c == null) return NotFound();

        return Ok(AuthService.ToCoachDto(c));

    }



    /// <summary>Coaches in this academy (owner + staff). Any club member may list for session assignment.</summary>

    [HttpGet("team")]

    public async Task<ActionResult<List<TeamMemberDto>>> GetTeam(CancellationToken ct)

    {

        if (_tenant.TenantId == null) return Forbid();

        var tid = _tenant.TenantId.Value;

        var list = await _db.Coaches.AsNoTracking()

            .Where(c => (c.Id == tid && c.ClubTenantId == null) || c.ClubTenantId == tid)

            .OrderBy(c => c.Name)

            .Select(c => new TeamMemberDto(

                c.Id,

                c.Name,

                c.Email,

                c.Id == tid && c.ClubTenantId == null,

                c.ClubTenantId == null || c.CanCreateSessions,

                c.ClubTenantId == null || c.CanManageStudents))

            .ToListAsync(ct);

        return Ok(list);

    }



    /// <summary>Club owner only: add a staff coach.</summary>

    [HttpPost("team")]

    public async Task<ActionResult<CoachDto>> CreateStaffCoach([FromBody] CreateStaffCoachRequest request, CancellationToken ct)

    {

        if (_tenant.TenantId == null || _tenant.UserId != _tenant.TenantId) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Name))

            return BadRequest("Email, password, and name are required.");

        var created = await _auth.CreateStaffCoachAsync(

            _tenant.TenantId.Value,

            request.Email,

            request.Password,

            request.Name,

            request.CanCreateSessions,

            request.CanManageStudents,

            ct);

        if (created == null) return BadRequest("Email may already be in use, or club was not found.");

        return Ok(created);

    }



    /// <summary>Club owner only: update a staff coach.</summary>

    [HttpPut("team/{id:guid}")]

    public async Task<ActionResult<CoachDto>> UpdateStaffCoach(Guid id, [FromBody] UpdateStaffCoachRequest request, CancellationToken ct)

    {

        if (_tenant.TenantId == null || _tenant.UserId != _tenant.TenantId) return Forbid();

        if (id == _tenant.TenantId) return BadRequest("Use profile settings to update the owner account.");

        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == id && x.ClubTenantId == _tenant.TenantId, ct);

        if (c == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name)) c.Name = request.Name.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))

        {

            var norm = request.Email.Trim().ToLowerInvariant();

            if (norm != c.Email && await _db.Coaches.AnyAsync(x => x.Email == norm && x.Id != id, ct))

                return BadRequest("Email is already in use.");

            c.Email = norm;

        }

        if (request.CanCreateSessions.HasValue) c.CanCreateSessions = request.CanCreateSessions.Value;

        if (request.CanManageStudents.HasValue) c.CanManageStudents = request.CanManageStudents.Value;

        if (!string.IsNullOrWhiteSpace(request.NewPassword))

            c.PasswordHash = _auth.HashPasswordForCoach(request.NewPassword.Trim());

        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(AuthService.ToCoachDto(c));

    }



    /// <summary>Club owner only: remove a staff coach (unlinks from sessions first).</summary>

    [HttpDelete("team/{id:guid}")]

    public async Task<ActionResult> DeleteStaffCoach(Guid id, CancellationToken ct)

    {

        if (_tenant.TenantId == null || _tenant.UserId != _tenant.TenantId) return Forbid();

        if (id == _tenant.TenantId) return BadRequest("Cannot remove the club owner.");

        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == id && x.ClubTenantId == _tenant.TenantId, ct);

        if (c == null) return NotFound();

        var links = await _db.SessionCoaches.Where(sc => sc.CoachId == id).ToListAsync(ct);

        _db.SessionCoaches.RemoveRange(links);

        _db.Coaches.Remove(c);

        await _db.SaveChangesAsync(ct);

        return NoContent();

    }



    [HttpPost("me/schedule-share-token")]

    public async Task<ActionResult<ScheduleShareTokenResponse>> RegenerateScheduleShareToken(CancellationToken ct)

    {

        if (_tenant.UserId == null) return Unauthorized();

        if (_tenant.TenantId == null || _tenant.UserId != _tenant.TenantId) return Forbid();

        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);

        if (c == null) return NotFound();

        for (var attempt = 0; attempt < 8; attempt++)

        {

            var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

            var taken = await _db.Coaches.AnyAsync(x => x.ScheduleShareToken == raw && x.Id != c.Id, ct);

            if (taken) continue;

            c.ScheduleShareToken = raw;

            c.UpdatedAt = DateTime.UtcNow;

            await AssignDefaultSlugIfNeededAsync(c, ct);

            await _db.SaveChangesAsync(ct);

            return Ok(new ScheduleShareTokenResponse(raw, c.ScheduleShareSlug));

        }

        return StatusCode(500, "Could not generate a unique link.");

    }



    [HttpPut("me")]

    public async Task<ActionResult<CoachDto>> UpdateMe([FromBody] UpdateCoachRequest request, CancellationToken ct)

    {

        if (_tenant.UserId == null) return Unauthorized();

        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);

        if (c == null) return NotFound();

        c.Name = request.Name ?? c.Name;

        c.AcademyName = request.AcademyName ?? c.AcademyName;

        c.AcademyType = request.AcademyType ?? c.AcademyType;

        c.PrimaryColor = request.PrimaryColor ?? c.PrimaryColor;

        c.LogoUrl = request.LogoUrl ?? c.LogoUrl;

        if (request.AcademyType != null && request.PrimaryColor == null)

            c.PrimaryColor = ThemeHelper.GetThemeColorForCategory(request.AcademyType);

        if (request.ScheduleShareSlug != null)

        {

            var slugTrim = request.ScheduleShareSlug.Trim();

            if (string.IsNullOrEmpty(slugTrim))

                c.ScheduleShareSlug = null;

            else if (!ScheduleSlugHelper.TryValidateManualSlug(slugTrim, out var normSlug, out var slugErr))

                return BadRequest(slugErr);

            else

            {

                var slugTaken = await _db.Coaches.AnyAsync(x => x.ScheduleShareSlug == normSlug && x.Id != c.Id, ct);

                if (slugTaken)

                    return BadRequest("That link path is already in use. Choose another.");

                c.ScheduleShareSlug = normSlug;

            }

        }

        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(AuthService.ToCoachDto(c));

    }



    [HttpPost("me/logo")]

    public async Task<ActionResult<CoachDto>> UploadLogo(IFormFile file, CancellationToken ct)

    {

        if (_tenant.UserId == null) return Unauthorized();

        if (_tenant.TenantId == null || _tenant.UserId != _tenant.TenantId) return Forbid();

        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);

        if (c == null) return NotFound();

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (string.IsNullOrEmpty(ext) || (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".gif"))

            return BadRequest("Invalid file type.");

        var dir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "logos");

        Directory.CreateDirectory(dir);

        var fileName = $"{c.Id}{ext}";

        var path = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(path))

            await file.CopyToAsync(stream, ct);

        c.LogoUrl = $"/uploads/logos/{fileName}";

        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(AuthService.ToCoachDto(c));

    }



    private async Task AssignDefaultSlugIfNeededAsync(Coach c, CancellationToken ct)

    {

        if (!string.IsNullOrEmpty(c.ScheduleShareSlug)) return;

        var baseSlug = ScheduleSlugHelper.SlugifyFromDisplayName(c.AcademyName ?? c.Name);

        for (var i = 0; i < 40; i++)

        {

            var candidate = i == 0 ? baseSlug : $"{baseSlug}-{i}";

            var taken = await _db.Coaches.AnyAsync(x => x.ScheduleShareSlug == candidate && x.Id != c.Id, ct);

            if (!taken)

            {

                c.ScheduleShareSlug = candidate;

                return;

            }

        }

    }

}



public record TeamMemberDto(Guid Id, string Name, string Email, bool IsOwner, bool CanCreateSessions, bool CanManageStudents);

public record CreateStaffCoachRequest(string Email, string Password, string Name, bool CanCreateSessions = false, bool CanManageStudents = false);

public record UpdateStaffCoachRequest(string? Name, string? Email, bool? CanCreateSessions, bool? CanManageStudents, string? NewPassword);

public record UpdateCoachRequest(string? Name, string? AcademyName, string? AcademyType, string? LogoUrl, string? PrimaryColor, string? ScheduleShareSlug);

public record ScheduleShareTokenResponse(string Token, string? Slug);


