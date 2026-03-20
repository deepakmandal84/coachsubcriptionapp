using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Services;

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
    public async Task<ActionResult<List<StudentListDto>>> List([FromQuery] string? status, [FromQuery] string? search, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var q = _db.Students.AsNoTracking();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<StudentStatus>(status, true, out var s))
            q = q.Where(x => x.Status == s);
        if (!string.IsNullOrEmpty(search))
        {
            var term = $"%{search}%";
            q = q.Where(x => EF.Functions.ILike(x.Name, term) || (x.Email != null && EF.Functions.ILike(x.Email, term)) || (x.ParentName != null && EF.Functions.ILike(x.ParentName, term)));
        }
        var list = await q.OrderByDescending(x => x.CreatedAt)
            .Select(x => new StudentListDto(x.Id, x.Name, x.ParentName, x.Email, x.Phone, x.Status.ToString(), x.Tags, x.CreatedAt))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudentDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        return Ok(new StudentDetailDto(x.Id, x.Name, x.ParentName, x.Email, x.Phone, x.Notes, x.Tags, x.Status.ToString(), x.CreatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<StudentDetailDto>> Create([FromBody] CreateStudentRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
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
            CreatedAt = DateTime.UtcNow
        };
        _db.Students.Add(student);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = student.Id }, new StudentDetailDto(student.Id, student.Name, student.ParentName, student.Email, student.Phone, student.Notes, student.Tags, student.Status.ToString(), student.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StudentDetailDto>> Update(Guid id, [FromBody] UpdateStudentRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        x.Name = request.Name;
        x.ParentName = request.ParentName;
        x.Email = request.Email;
        x.Phone = request.Phone;
        x.Notes = request.Notes;
        x.Tags = request.Tags;
        x.Status = Enum.TryParse<StudentStatus>(request.Status, true, out var st) ? st : x.Status;
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new StudentDetailDto(x.Id, x.Name, x.ParentName, x.Email, x.Phone, x.Notes, x.Tags, x.Status.ToString(), x.CreatedAt));
    }

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
        var x = await _db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        _db.Students.Remove(x);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
