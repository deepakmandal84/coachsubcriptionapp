using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Services;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Authorize]
[Route("api/students/{studentId:guid}/progress")]
public class StudentProgressController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public StudentProgressController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<ActionResult<StudentProgressSummaryDto>> GetSummary(Guid studentId, [FromQuery] int months = 12, CancellationToken ct = default)
    {
        var student = await LoadStudentAsync(studentId, ct);
        if (student == null) return NotFound();
        var entries = await LoadEntriesAsync(studentId, months, ct);
        return Ok(ProgressMeasurementHelper.BuildStudentSummary(student, entries));
    }

    [HttpGet("chart")]
    public async Task<ActionResult<ProgressChartDto>> GetChart(Guid studentId, [FromQuery] int months = 12, CancellationToken ct = default)
    {
        var student = await LoadStudentAsync(studentId, ct);
        if (student == null) return NotFound();
        var entries = await LoadEntriesAsync(studentId, months, ct);
        return Ok(ProgressMeasurementHelper.BuildChart(entries, student.MeasurementUnit));
    }

    [HttpPost("preview-body-fat")]
    public async Task<ActionResult<BodyFatPreviewDto>> PreviewBodyFat(Guid studentId, [FromBody] BodyFatPreviewRequest request, CancellationToken ct = default)
    {
        var student = await LoadStudentAsync(studentId, ct);
        if (student == null) return NotFound();
        return Ok(BuildPreview(student, request));
    }

    [HttpPost]
    public async Task<ActionResult<ProgressCheckInDto>> Create(Guid studentId, [FromBody] CreateProgressCheckInRequest request, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student == null) return NotFound();

        var entry = MapNewEntry(student, request, ProgressSource.Coach, _tenant.UserId);
        _db.ProgressCheckIns.Add(entry);
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToDto(entry, student.MeasurementUnit));
    }

    [HttpPut("{checkInId:guid}")]
    public async Task<ActionResult<ProgressCheckInDto>> Update(Guid studentId, Guid checkInId, [FromBody] UpdateProgressCheckInRequest request, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student == null) return NotFound();

        var entry = await _db.ProgressCheckIns.FirstOrDefaultAsync(p => p.Id == checkInId && p.StudentId == studentId, ct);
        if (entry == null) return NotFound();

        ApplyUpdate(student, entry, request);
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToDto(entry, student.MeasurementUnit));
    }

    [HttpDelete("{checkInId:guid}")]
    public async Task<ActionResult> Delete(Guid studentId, Guid checkInId, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        if (await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == studentId, ct) == null) return NotFound();

        var entry = await _db.ProgressCheckIns.FirstOrDefaultAsync(p => p.Id == checkInId && p.StudentId == studentId, ct);
        if (entry == null) return NotFound();

        _db.ProgressCheckIns.Remove(entry);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ProgressProfileDto>> UpdateProfile(Guid studentId, [FromBody] UpdateProgressProfileRequest request, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student == null) return NotFound();

        ProgressMeasurementHelper.ApplyProfileUpdate(student, request);
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(ProgressMeasurementHelper.ToProfileDto(student));
    }

    async Task<Student?> LoadStudentAsync(Guid studentId, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return null;
        return await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == studentId, ct);
    }

    async Task<List<ProgressCheckIn>> LoadEntriesAsync(Guid studentId, int months, CancellationToken ct)
    {
        var from = DateTime.UtcNow.Date.AddMonths(-Math.Clamp(months, 1, 60));
        return await _db.ProgressCheckIns.AsNoTracking()
            .Where(p => p.StudentId == studentId && p.RecordedOn >= from)
            .OrderByDescending(p => p.RecordedOn)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    static BodyFatPreviewDto BuildPreview(Student student, BodyFatPreviewRequest request)
    {
        var measurementsCm = ProgressMeasurementHelper.FromUserMeasurements(request.Measurements, student.MeasurementUnit);
        var weightKg = ProgressMeasurementHelper.KgFromUserWeight(request.Weight, student.MeasurementUnit);
        var calc = BodyFatCalculator.Preview(student, measurementsCm, weightKg);
        var (_, method) = BodyFatCalculator.Resolve(null, student, measurementsCm, weightKg);

        var missing = new List<string>();
        if (student.Gender is StudentGender.Unspecified) missing.Add("Gender");
        if (student.HeightCm == null) missing.Add("Height (in profile)");
        if (student.DateOfBirth == null && student.Gender != StudentGender.Unspecified) missing.Add("Date of birth (for BMI fallback)");
        if (measurementsCm?.Neck == null) missing.Add("Neck");
        if (measurementsCm?.Waist == null) missing.Add("Waist");
        if (student.Gender == StudentGender.Female && measurementsCm?.Hips == null) missing.Add("Hips");
        if (weightKg == null && calc == null) missing.Add("Weight");

        return new BodyFatPreviewDto(calc, method?.ToString(), missing);
    }

    static ProgressCheckIn MapNewEntry(Student student, CreateProgressCheckInRequest request, ProgressSource source, Guid? coachId)
    {
        var entry = new ProgressCheckIn
        {
            Id = Guid.NewGuid(),
            TenantId = student.TenantId,
            StudentId = student.Id,
            RecordedOn = DateTime.SpecifyKind(request.RecordedOn.Date, DateTimeKind.Utc),
            Source = source,
            CreatedByCoachId = coachId,
            CreatedAt = DateTime.UtcNow,
        };
        ProgressMeasurementHelper.ApplyCheckInMetrics(entry, student, request);
        return entry;
    }

    static void ApplyUpdate(Student student, ProgressCheckIn entry, UpdateProgressCheckInRequest request)
    {
        entry.RecordedOn = DateTime.SpecifyKind(request.RecordedOn.Date, DateTimeKind.Utc);
        ProgressMeasurementHelper.ApplyCheckInMetrics(entry, student, new CreateProgressCheckInRequest(
            request.RecordedOn, request.Weight, request.BodyFatPercent, request.Measurements, request.Notes));
    }
}
