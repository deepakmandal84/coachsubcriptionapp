using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db) => _db = db;

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
            .OrderBy(c => c.Email)
            .Select(c => new CoachListDto(c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("coaches/{id:guid}/data")]
    public async Task<ActionResult<AdminCoachDataDto>> GetCoachData(Guid id, CancellationToken ct)
    {
        var coach = await _db.Coaches.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
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

    [HttpPut("coaches/{id:guid}")]
    public async Task<ActionResult<CoachListDto>> UpdateCoach(Guid id, [FromBody] UpdateCoachStatusRequest request, CancellationToken ct)
    {
        var c = await _db.Coaches.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return NotFound();
        c.IsActive = request.IsActive;
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new CoachListDto(c.Id, c.Email, c.Name, c.AcademyName, c.IsActive, c.CreatedAt));
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
public record UpdateCoachStatusRequest(bool IsActive);
