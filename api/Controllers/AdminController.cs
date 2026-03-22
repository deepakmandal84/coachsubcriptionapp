using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Services;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _auth;

    public AdminController(AppDbContext db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminDashboardDto>> GetDashboard(CancellationToken ct)
    {
        var coaches = await _db.Coaches.IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt })
            .ToListAsync(ct);
        var result = new List<AdminCoachRowDto>();
        foreach (var c in coaches)
        {
            var studentCount = await _db.Students.IgnoreQueryFilters().CountAsync(s => s.TenantId == c.Id, ct);
            var activeSubCount = await _db.Subscriptions.IgnoreQueryFilters().CountAsync(s => s.TenantId == c.Id && s.Status == SubscriptionStatus.Active, ct);
            result.Add(new AdminCoachRowDto(c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt, studentCount, activeSubCount));
        }
        return Ok(new AdminDashboardDto(result, result.Count));
    }

    [HttpGet("coaches")]
    public async Task<ActionResult<List<CoachListDto>>> ListCoaches(CancellationToken ct)
    {
        var list = await _db.Coaches.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.Role == Role.Coach && c.ClubTenantId == null)
            .OrderBy(c => c.Email)
            .Select(c => new CoachListDto(c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("coaches/{id:guid}/data")]
    public async Task<ActionResult<AdminCoachDataDto>> GetCoachData(Guid id, CancellationToken ct)
    {
        var coach = await _db.Coaches.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(c => c.Id == id && c.Role == Role.Coach && c.ClubTenantId == null, ct);
        if (coach == null) return NotFound();
        var students = await _db.Students.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(s => s.TenantId == id)
            .OrderBy(s => s.Name)
            .Select(s => new AdminStudentDto(s.Id, s.Name, s.ParentName, s.Email, s.Phone, s.Status.ToString(), s.CreatedAt))
            .ToListAsync(ct);
        var subscriptions = await _db.Subscriptions.IgnoreQueryFilters()
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Package)
            .Where(s => s.TenantId == id)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new AdminSubscriptionDto(s.Id, s.StudentId, s.Student.Name, s.PackageId, s.Package.Name, s.StartDate, s.ExpiryDate, s.RemainingSessions, s.Status.ToString(), s.PaymentStatus.ToString(), s.CreatedAt))
            .ToListAsync(ct);
        var packages = await _db.Packages.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(p => p.TenantId == id)
            .OrderBy(p => p.Name)
            .Select(p => new AdminPackageDto(p.Id, p.Name, p.Price, p.ValidityDays, p.TotalSessions, p.Type.ToString()))
            .ToListAsync(ct);
        return Ok(new AdminCoachDataDto(
            new AdminCoachInfoDto(coach.Id, coach.Email, coach.Name, coach.AcademyName, coach.IsActive, coach.CreatedAt),
            students,
            subscriptions,
            packages));
    }

    [HttpPost("academies")]
    public async Task<ActionResult<CoachListDto>> OnboardAcademy([FromBody] AdminOnboardAcademyRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.AcademyName))
            return BadRequest("Academy name, email, and password are required.");
        var norm = request.Email.Trim().ToLowerInvariant();
        if (await _db.Coaches.IgnoreQueryFilters().AnyAsync(c => c.Email == norm, ct))
            return Conflict("That email is already registered.");
        var name = string.IsNullOrWhiteSpace(request.OwnerName) ? request.AcademyName.Trim() : request.OwnerName.Trim();
        var coach = new Coach
        {
            Id = Guid.NewGuid(),
            Email = norm,
            PasswordHash = _auth.HashPasswordForCoach(request.Password),
            Name = name,
            AcademyName = request.AcademyName.Trim(),
            Role = Role.Coach,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _db.Coaches.Add(coach);
        await _db.SaveChangesAsync(ct);
        return Ok(new CoachListDto(coach.Id, coach.Email, coach.Name, coach.AcademyName, coach.IsActive, coach.CreatedAt));
    }

    [HttpPut("coaches/{id:guid}")]
    public async Task<ActionResult<CoachListDto>> UpdateCoach(Guid id, [FromBody] AdminUpdateAcademyRequest request, CancellationToken ct)
    {
        var c = await _db.Coaches.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.Role == Role.Coach && x.ClubTenantId == null, ct);
        if (c == null) return NotFound();
        if (request.IsActive.HasValue) c.IsActive = request.IsActive.Value;
        if (!string.IsNullOrWhiteSpace(request.AcademyName)) c.AcademyName = request.AcademyName.Trim();
        if (!string.IsNullOrWhiteSpace(request.OwnerName)) c.Name = request.OwnerName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var norm = request.Email.Trim().ToLowerInvariant();
            if (norm != c.Email && await _db.Coaches.IgnoreQueryFilters().AnyAsync(x => x.Email == norm && x.Id != id, ct))
                return Conflict("That email is already in use.");
            c.Email = norm;
        }
        if (!string.IsNullOrWhiteSpace(request.NewPassword)) c.PasswordHash = _auth.HashPasswordForCoach(request.NewPassword.Trim());
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new CoachListDto(c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt));
    }

    [HttpDelete("coaches/{id:guid}")]
    public async Task<ActionResult> DeactivateAcademy(Guid id, CancellationToken ct)
    {
        var c = await _db.Coaches.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.Role == Role.Coach && x.ClubTenantId == null, ct);
        if (c == null) return NotFound();
        c.IsActive = false;
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record AdminDashboardDto(List<AdminCoachRowDto> Coaches, int TotalCoaches);
public record AdminCoachRowDto(Guid Id, string Email, string Name, string? AcademyName, bool IsActive, DateTime CreatedAt, int StudentCount, int ActiveSubscriptionCount);

public record AdminCoachDataDto(AdminCoachInfoDto Coach, List<AdminStudentDto> Students, List<AdminSubscriptionDto> Subscriptions, List<AdminPackageDto> Packages);
public record AdminCoachInfoDto(Guid Id, string Email, string Name, string? AcademyName, bool IsActive, DateTime CreatedAt);
public record AdminStudentDto(Guid Id, string Name, string? ParentName, string? Email, string? Phone, string Status, DateTime CreatedAt);
public record AdminSubscriptionDto(Guid Id, Guid StudentId, string StudentName, Guid PackageId, string PackageName, DateTime StartDate, DateTime ExpiryDate, int? RemainingSessions, string Status, string PaymentStatus, DateTime CreatedAt);
public record AdminPackageDto(Guid Id, string Name, decimal Price, int ValidityDays, int? TotalSessions, string Type);

public record CoachListDto(Guid Id, string Email, string Name, string? AcademyName, bool IsActive, DateTime CreatedAt);

public record AdminOnboardAcademyRequest(string AcademyName, string Email, string Password, string? OwnerName);

public record AdminUpdateAcademyRequest(bool? IsActive, string? AcademyName, string? Email, string? OwnerName, string? NewPassword);
