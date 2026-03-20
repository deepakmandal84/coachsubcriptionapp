using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.DTOs;

namespace CoachSubscriptionApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageLogsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenantService _tenant;

    public MessageLogsController(AppDbContext db, ICurrentTenantService tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<ActionResult<List<MessageLogDto>>> List([FromQuery] string? channel, [FromQuery] string? template, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        if (_tenant.TenantId == null) return Forbid();
        var q = _db.MessageLogs.AsNoTracking();
        if (!string.IsNullOrEmpty(channel) && Enum.TryParse<Entities.MessageChannel>(channel, true, out var ch))
            q = q.Where(x => x.Channel == ch);
        if (!string.IsNullOrEmpty(template))
        {
            var templates = template.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(s => s.Trim()).ToList();
            if (templates.Count > 0)
                q = q.Where(x => templates.Contains(x.TemplateId));
        }
        if (from.HasValue) q = q.Where(x => x.SentAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.SentAt <= to.Value);
        var list = await q.OrderByDescending(x => x.SentAt).Take(200)
            .Select(x => new MessageLogDto(x.Id, x.Recipient, x.Channel.ToString(), x.TemplateId, x.Status.ToString(), x.ProviderMessageId, x.SentAt, x.ErrorMessage))
            .ToListAsync(ct);
        return Ok(list);
    }
}
