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
public class PackagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public PackagesController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<ActionResult<List<PackageListDto>>> List(CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var list = await _db.Packages.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new PackageListDto(x.Id, x.Name, x.Price, x.ValidityDays, x.TotalSessions, x.Type.ToString(), x.Category, x.CreatedAt))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PackageDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Packages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
        if (x == null) return NotFound();
        return Ok(new PackageDetailDto(x.Id, x.Name, x.Price, x.ValidityDays, x.TotalSessions, x.Type.ToString(), x.Category, x.CreatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<PackageDetailDto>> Create([FromBody] CreatePackageRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var tenantId = _tenant.TenantId.Value;
        var pkg = new Package
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            Price = request.Price,
            ValidityDays = request.ValidityDays,
            TotalSessions = request.Type == "MonthlyUnlimited" ? null : request.TotalSessions,
            Type = Enum.Parse<PackageType>(request.Type),
            Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        _db.Packages.Add(pkg);
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var coach = await _db.Coaches.FirstOrDefaultAsync(c => c.Id == tenantId, ct);
            if (coach != null)
            {
                coach.AcademyType = request.Category.Trim();
                coach.PrimaryColor = ThemeHelper.GetThemeColorForCategory(coach.AcademyType);
                coach.UpdatedAt = DateTime.UtcNow;
            }
        }
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = pkg.Id }, new PackageDetailDto(pkg.Id, pkg.Name, pkg.Price, pkg.ValidityDays, pkg.TotalSessions, pkg.Type.ToString(), pkg.Category, pkg.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PackageDetailDto>> Update(Guid id, [FromBody] UpdatePackageRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var tenantId = _tenant.TenantId.Value;
        var x = await _db.Packages.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (x == null) return NotFound();
        x.Name = request.Name;
        x.Price = request.Price;
        x.ValidityDays = request.ValidityDays;
        x.TotalSessions = request.Type == "MonthlyUnlimited" ? null : request.TotalSessions;
        x.Type = Enum.Parse<PackageType>(request.Type);
        x.Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();
        x.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var coach = await _db.Coaches.FirstOrDefaultAsync(c => c.Id == tenantId, ct);
            if (coach != null)
            {
                coach.AcademyType = request.Category.Trim();
                coach.PrimaryColor = ThemeHelper.GetThemeColorForCategory(coach.AcademyType);
                coach.UpdatedAt = DateTime.UtcNow;
            }
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new PackageDetailDto(x.Id, x.Name, x.Price, x.ValidityDays, x.TotalSessions, x.Type.ToString(), x.Category, x.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Packages.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (x == null) return NotFound();
        _db.Packages.Remove(x);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
