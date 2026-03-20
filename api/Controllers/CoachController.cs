using System.Security.Cryptography;
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
public class CoachController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public CoachController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("me")]
    public async Task<ActionResult<CoachDto>> GetMe(CancellationToken ct)
    {
        if (_tenant.UserId == null) return Unauthorized();
        var c = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);
        if (c == null) return NotFound();
        return Ok(new CoachDto(c.Id, c.Email, c.Name, c.AcademyName, c.AcademyType, c.LogoUrl, c.PrimaryColor, c.Role.ToString(), c.ScheduleShareToken));
    }

    [HttpPost("me/schedule-share-token")]
    public async Task<ActionResult<ScheduleShareTokenResponse>> RegenerateScheduleShareToken(CancellationToken ct)
    {
        if (_tenant.UserId == null) return Unauthorized();
        var c = await _db.Coaches.FirstOrDefaultAsync(x => x.Id == _tenant.UserId.Value, ct);
        if (c == null) return NotFound();
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            var taken = await _db.Coaches.AnyAsync(x => x.ScheduleShareToken == raw && x.Id != c.Id, ct);
            if (taken) continue;
            c.ScheduleShareToken = raw;
            c.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return Ok(new ScheduleShareTokenResponse(raw));
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
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new CoachDto(c.Id, c.Email, c.Name, c.AcademyName, c.AcademyType, c.LogoUrl, c.PrimaryColor, c.Role.ToString(), c.ScheduleShareToken));
    }

    [HttpPost("me/logo")]
    public async Task<ActionResult<CoachDto>> UploadLogo(IFormFile file, CancellationToken ct)
    {
        if (_tenant.UserId == null) return Unauthorized();
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
        return Ok(new CoachDto(c.Id, c.Email, c.Name, c.AcademyName, c.AcademyType, c.LogoUrl, c.PrimaryColor, c.Role.ToString(), c.ScheduleShareToken));
    }
}

public record UpdateCoachRequest(string? Name, string? AcademyName, string? AcademyType, string? LogoUrl, string? PrimaryColor);
public record ScheduleShareTokenResponse(string Token);
