using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;
using CoachSubscriptionApi.Services.Notifications;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;
    private readonly IReminderService _reminder;
    private readonly IConfiguration _config;

    public SubscriptionsController(AppDbContext db, ICurrentTenantService tenant, IReminderService reminder, IConfiguration config)
    {
        _db = db;
        _tenant = tenant;
        _reminder = reminder;
        _config = config;
    }

    [HttpGet]
    public async Task<ActionResult<List<SubscriptionListDto>>> List([FromQuery] Guid? studentId, [FromQuery] string? status, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        IQueryable<Subscription> q = _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Package);
        if (studentId.HasValue) q = q.Where(x => x.StudentId == studentId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<SubscriptionStatus>(status, true, out var st))
            q = q.Where(x => x.Status == st);
        var list = await q.OrderByDescending(x => x.CreatedAt)
            .Select(x => new SubscriptionListDto(
                x.Id,
                x.StudentId,
                x.Student.Name,
                x.PackageId,
                x.Package.Name,
                x.StartDate,
                x.ExpiryDate,
                x.RemainingSessions,
                x.Status.ToString(),
                x.PaymentStatus.ToString(),
                x.PaymentMethod.ToString(),
                x.CreatedAt,
                _db.RenewalRequests.Any(r => r.StudentId == x.StudentId && (r.SubscriptionId == x.Id || r.SubscriptionId == null) && r.Status == RenewalRequestStatus.Pending)
            ))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SubscriptionDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Package)
            .Include(s => s.Payments)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        var payments = x.Payments.Select(p => new PaymentDto(p.Id, p.Amount, p.PaidAt, p.Method.ToString(), p.Notes)).ToList();
        return Ok(new SubscriptionDetailDto(x.Id, x.StudentId, x.Student.Name, x.PackageId, x.Package.Name, x.StartDate, x.ExpiryDate, x.RemainingSessions, x.Status.ToString(), x.PaymentStatus.ToString(), x.PaymentMethod.ToString(), payments, x.CreatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<SubscriptionDetailDto>> Create([FromBody] CreateSubscriptionRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var pkg = await _db.Packages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PackageId, ct);
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.StudentId, ct);
        if (pkg == null || student == null) return NotFound("Package or Student not found.");
        var startDate = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
        var expiry = startDate.AddDays(pkg.ValidityDays);
        if (!Enum.TryParse<PaymentStatus>(request.PaymentStatus, true, out var paymentStatus))
            return BadRequest("Invalid payment status.");
        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var paymentMethod))
            return BadRequest("Invalid payment method.");
        int? remaining = pkg.Type == PackageType.MonthlyUnlimited ? null : pkg.TotalSessions;
        var sub = new Subscription
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId.Value,
            StudentId = request.StudentId,
            PackageId = request.PackageId,
            StartDate = startDate,
            ExpiryDate = expiry,
            RemainingSessions = remaining,
            Status = SubscriptionStatus.Active,
            PaymentStatus = paymentStatus,
            PaymentMethod = paymentMethod,
            CreatedAt = DateTime.UtcNow
        };
        _db.Subscriptions.Add(sub);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = sub.Id }, new SubscriptionDetailDto(sub.Id, sub.StudentId, student.Name, sub.PackageId, pkg.Name, sub.StartDate, sub.ExpiryDate, sub.RemainingSessions, sub.Status.ToString(), sub.PaymentStatus.ToString(), sub.PaymentMethod.ToString(), new List<PaymentDto>(), sub.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SubscriptionDetailDto>> Update(Guid id, [FromBody] UpdateSubscriptionRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var x = await _db.Subscriptions.Include(s => s.Student).Include(s => s.Package).Include(s => s.Payments).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (x == null) return NotFound();
        if (request.ExpiryDate.HasValue) x.ExpiryDate = DateTime.SpecifyKind(request.ExpiryDate.Value.Date, DateTimeKind.Utc);
        if (request.RemainingSessions.HasValue) x.RemainingSessions = request.RemainingSessions;
        if (request.Status != null && Enum.TryParse<SubscriptionStatus>(request.Status, true, out var st)) x.Status = st;
        if (request.PaymentStatus != null && Enum.TryParse<PaymentStatus>(request.PaymentStatus, true, out var ps)) x.PaymentStatus = ps;
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        var payments = x.Payments.Select(p => new PaymentDto(p.Id, p.Amount, p.PaidAt, p.Method.ToString(), p.Notes)).ToList();
        return Ok(new SubscriptionDetailDto(x.Id, x.StudentId, x.Student.Name, x.PackageId, x.Package.Name, x.StartDate, x.ExpiryDate, x.RemainingSessions, x.Status.ToString(), x.PaymentStatus.ToString(), x.PaymentMethod.ToString(), payments, x.CreatedAt));
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<ActionResult<SubscriptionDetailDto>> RecordPayment(Guid id, [FromBody] RecordPaymentRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var sub = await _db.Subscriptions.Include(s => s.Student).Include(s => s.Package).Include(s => s.Payments).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sub == null) return NotFound();
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            TenantId = sub.TenantId,
            SubscriptionId = sub.Id,
            Amount = request.Amount,
            PaidAt = DateTime.UtcNow,
            Method = Enum.Parse<PaymentMethod>(request.Method),
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };
        _db.Payments.Add(payment);
        sub.PaymentStatus = PaymentStatus.Paid;
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        var payments = sub.Payments.Concat(new[] { payment }).Select(p => new PaymentDto(p.Id, p.Amount, p.PaidAt, p.Method.ToString(), p.Notes)).ToList();
        return Ok(new SubscriptionDetailDto(sub.Id, sub.StudentId, sub.Student.Name, sub.PackageId, sub.Package.Name, sub.StartDate, sub.ExpiryDate, sub.RemainingSessions, sub.Status.ToString(), sub.PaymentStatus.ToString(), sub.PaymentMethod.ToString(), payments, sub.CreatedAt));
    }

    [HttpPost("{id:guid}/send-reminder")]
    public async Task<ActionResult> SendReminder(Guid id, [FromQuery] string? channel, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var exists = await _db.Subscriptions.AnyAsync(s => s.Id == id, ct);
        if (!exists) return NotFound();
        await _reminder.SendReminderNowAsync(id, channel, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/parent-link")]
    public async Task<ActionResult<ParentLinkResult>> CreateParentLink(Guid id, [FromBody] CreateParentLinkRequest request, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var sub = await _db.Subscriptions.AsNoTracking().Include(s => s.Student).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sub == null) return NotFound();
        var (link, token) = await CreateLinkAsync(sub.TenantId, sub.StudentId, sub.Id, request.ExpiryDays, ct);
        if (token == null) return BadRequest("Could not create link.");
        return Ok(new ParentLinkResult($"{GetBaseUrl()}/p/{token}"));
    }

    [HttpGet("parent-link")]
    public async Task<ActionResult<ParentLinkResult>> GetOrCreateParentLink([FromQuery] Guid studentId, [FromQuery] Guid? subscriptionId, [FromQuery] int expiryDays = 30, CancellationToken ct = default)
    {
        if (_tenant.TenantId == null) return Forbid();
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student == null) return NotFound("Student not found.");
        var (_, token) = await CreateLinkAsync(_tenant.TenantId.Value, studentId, subscriptionId, expiryDays, ct);
        if (token == null) return BadRequest("Could not create link.");
        return Ok(new ParentLinkResult($"{GetBaseUrl()}/p/{token}"));
    }

    [HttpPost("{id:guid}/confirm-renewal")]
    public async Task<ActionResult<RenewalTransactionDto>> ConfirmRenewal(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();

        var sub = await _db.Subscriptions
            .Include(s => s.Student)
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sub == null) return NotFound("Subscription not found.");

        var request = await _db.RenewalRequests
            .Where(r =>
                r.StudentId == sub.StudentId &&
                (r.SubscriptionId == sub.Id || r.SubscriptionId == null) &&
                r.Status == RenewalRequestStatus.Pending)
            .OrderByDescending(r => r.RequestedAt)
            .FirstOrDefaultAsync(ct);

        if (request == null)
            return BadRequest("No pending renewal request for this user.");

        request.Status = RenewalRequestStatus.Confirmed;
        request.SubscriptionId ??= sub.Id;
        request.ConfirmedAt = DateTime.UtcNow;

        var tx = new RenewalTransaction
        {
            Id = Guid.NewGuid(),
            TenantId = sub.TenantId,
            StudentId = sub.StudentId,
            SubscriptionId = sub.Id,
            RenewalRequestId = request.Id,
            RequestedAt = request.RequestedAt,
            ConfirmedAt = request.ConfirmedAt.Value
        };
        _db.RenewalTransactions.Add(tx);

        await _db.SaveChangesAsync(ct);

        return Ok(new RenewalTransactionDto(
            tx.Id,
            tx.StudentId,
            sub.Student.Name,
            tx.SubscriptionId,
            sub.Package.Name,
            tx.RequestedAt,
            tx.ConfirmedAt
        ));
    }

    [HttpGet("{id:guid}/renewal-transactions")]
    public async Task<ActionResult<List<RenewalTransactionDto>>> RenewalTransactions(Guid id, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();

        var sub = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sub == null) return NotFound("Subscription not found.");

        var rows = await _db.RenewalTransactions
            .AsNoTracking()
            .Where(x => x.StudentId == sub.StudentId)
            .Include(x => x.Subscription).ThenInclude(s => s!.Package)
            .OrderByDescending(x => x.ConfirmedAt)
            .Select(x => new RenewalTransactionDto(
                x.Id,
                x.StudentId,
                sub.Student.Name,
                x.SubscriptionId,
                x.Subscription != null ? x.Subscription.Package.Name : null,
                x.RequestedAt,
                x.ConfirmedAt
            ))
            .ToListAsync(ct);

        return Ok(rows);
    }

    private async Task<(ParentPortalLink link, string? token)> CreateLinkAsync(Guid tenantId, Guid studentId, Guid? subscriptionId, int expiryDays, CancellationToken ct)
    {
        var tokenBytes = new byte[32];
        RandomNumberGenerator.Fill(tokenBytes);
        var token = Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var hash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
        var link = new ParentPortalLink
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            StudentId = studentId,
            SubscriptionId = subscriptionId,
            TokenHash = hash,
            TokenExpiresAt = DateTime.UtcNow.AddDays(expiryDays),
            CreatedAt = DateTime.UtcNow
        };
        _db.ParentPortalLinks.Add(link);
        await _db.SaveChangesAsync(ct);
        return (link, token);
    }

    private string GetBaseUrl()
    {
        // Explicit override for deployments
        var configured = _config["Web:BaseUrl"] ?? _config["Frontend:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.TrimEnd('/');

        // Best effort in local/proxy scenarios
        var origin = Request.Headers.Origin.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(origin))
            return origin.TrimEnd('/');

        var cors = _config["Cors:Origins"];
        if (!string.IsNullOrWhiteSpace(cors))
        {
            var first = cors.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(first))
                return first.TrimEnd('/');
        }

        return $"{Request.Scheme}://{Request.Host}";
    }

    public record ParentLinkResult(string Url);
}
