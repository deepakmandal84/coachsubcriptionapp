using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Helpers;
using CoachSubscriptionApi.Services;
using Npgsql;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public StudentsController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<ActionResult<List<StudentListDto>>> List(
        [FromQuery] string? status,
        [FromQuery] string? roster,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var q = _db.Students.AsNoTracking();

        if (!string.IsNullOrEmpty(roster))
        {
            var r = roster.Trim().ToLowerInvariant();
            if (r is "active" or "current")
                q = q.Where(x => x.Status != StudentStatus.Inactive);
            else if (r is "deactivated" or "inactive")
                q = q.Where(x => x.Status == StudentStatus.Inactive);
        }
        else if (string.IsNullOrEmpty(status))
        {
            // Default roster: hide deactivated unless explicitly requested.
            q = q.Where(x => x.Status != StudentStatus.Inactive);
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<StudentStatus>(status, true, out var s))
            q = q.Where(x => x.Status == s);
        if (!string.IsNullOrEmpty(search))
        {
            var term = $"%{search}%";
            q = q.Where(x => EF.Functions.ILike(x.Name, term) || (x.Email != null && EF.Functions.ILike(x.Email, term)) || (x.ParentName != null && EF.Functions.ILike(x.ParentName, term)));
        }
        var list = await q.OrderByDescending(x => x.CreatedAt)
            .Select(x => new StudentListDto(x.Id, x.Name, x.ParentName, x.Email, x.Phone, x.Status.ToString(), x.Tags, x.MeasurementUnit.ToString(), x.Gender.ToString(), x.CreatedAt))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudentDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        return Ok(ProgressMeasurementHelper.ToStudentDetailDto(x));
    }

    [HttpPut("{id:guid}/measurement-unit")]
    public async Task<ActionResult> UpdateMeasurementUnit(Guid id, [FromBody] UpdateStudentMeasurementUnitRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        if (!Enum.TryParse<MeasurementUnit>(request.MeasurementUnit, true, out var unit))
            return BadRequest("MeasurementUnit must be Metric or Imperial.");
        x.MeasurementUnit = unit;
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<StudentDetailDto>> Create([FromBody] CreateStudentRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (!await ClubStaffPermissions.CanManageStudentsAsync(_db, _tenant, ct)) return Forbid();
        var student = new Student
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId.Value,
            Name = request.Name,
            ParentName = request.ParentName,
            Email = request.Email,
            Phone = request.Phone,
            Notes = request.Notes,
            Tags = request.Tags,
            Status = Enum.TryParse<StudentStatus>(request.Status, true, out var st) ? st : StudentStatus.Active,
            MeasurementUnit = ParseMeasurementUnit(request.MeasurementUnit),
            CreatedAt = DateTime.UtcNow
        };
        ProgressMeasurementHelper.ApplyStudentDemographics(student, request.Gender, request.Height, request.DateOfBirth);
        _db.Students.Add(student);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = student.Id }, ProgressMeasurementHelper.ToStudentDetailDto(student));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StudentDetailDto>> Update(Guid id, [FromBody] UpdateStudentRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (!await ClubStaffPermissions.CanManageStudentsAsync(_db, _tenant, ct)) return Forbid();
        var x = await _db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        x.Name = request.Name;
        x.ParentName = request.ParentName;
        x.Email = request.Email;
        x.Phone = request.Phone;
        x.Notes = request.Notes;
        x.Tags = request.Tags;
        x.Status = Enum.TryParse<StudentStatus>(request.Status, true, out var st) ? st : x.Status;
        if (request.MeasurementUnit != null)
            x.MeasurementUnit = ParseMeasurementUnit(request.MeasurementUnit);
        ProgressMeasurementHelper.ApplyStudentDemographics(x, request.Gender, request.Height, request.DateOfBirth);
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToStudentDetailDto(x));
    }

    static MeasurementUnit ParseMeasurementUnit(string? value) =>
        Enum.TryParse<MeasurementUnit>(value, true, out var u) ? u : MeasurementUnit.Metric;

    [HttpPost("class-usage")]
    public async Task<ActionResult<BatchClassUsageResponse>> BatchClassUsage([FromBody] BatchClassUsageRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var results = new List<StudentClassUsageDto>();
        foreach (var sid in request.StudentIds.Distinct())
        {
            var exists = await _db.Students.AsNoTracking().AnyAsync(s => s.Id == sid && s.TenantId == _tenant.TenantId, ct);
            if (!exists) continue;
            var summary = await ClassUsageQueries.GetSummaryAsync(_db, _tenant.TenantId.Value, sid, null, ct);
            results.Add(new StudentClassUsageDto(sid, summary));
        }
        return Ok(new BatchClassUsageResponse(results));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (!await ClubStaffPermissions.CanManageStudentsAsync(_db, _tenant, ct)) return Forbid();

        try
        {
            var student = await StudentLifecycleService.DeactivateAsync(_db, _tenant.TenantId.Value, id, ct);
            if (student == null) return NotFound();
            return NoContent();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23503")
        {
            return Conflict(new ProblemDetails
            {
                Title = "Cannot deactivate student",
                Detail = "Some linked records could not be cleared. Try again or contact support.",
                Status = StatusCodes.Status409Conflict,
            });
        }
    }

    [HttpPost("{id:guid}/reactivate")]
    public async Task<ActionResult<StudentDetailDto>> Reactivate(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (!await ClubStaffPermissions.CanManageStudentsAsync(_db, _tenant, ct)) return Forbid();

        var existing = await _db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (existing == null) return NotFound();
        if (existing.Status != StudentStatus.Inactive)
            return BadRequest("Only deactivated students can be rejoined to the roster.");

        var student = await StudentLifecycleService.ReactivateAsync(_db, _tenant.TenantId.Value, id, ct);
        return Ok(ProgressMeasurementHelper.ToStudentDetailDto(student!));
    }
}
